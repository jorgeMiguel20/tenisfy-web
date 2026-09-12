// app/api/cron/price-check/route.ts
// Cron job real (codigo servidor, sem agente de IA a navegar) que verifica
// precos e stock diretamente nas paginas das lojas parceiras e submete os
// resultados como propostas em /admin/precos para o Jorge rever.
//
// Substitui a verificacao anterior (um agente a navegar num browser numa
// tarefa agendada), que se mostrou pouco fiavel: sessoes agendadas nao
// conseguiam usar as ferramentas de browser de forma consistente. Este
// endpoint corre isolado no servidor da Vercel (Vercel Cron chama-o
// diretamente, ver vercel.json), sem depender de nenhuma ferramenta de IA
// estar disponivel em tempo de execucao.
//
// Reutiliza os dois endpoints ja existentes e testados:
//  - GET  /api/admin/price-check-targets    (o que ha para verificar)
//  - POST /api/admin/price-check-proposals  (onde entram os resultados)
// em vez de duplicar a logica de acesso a base de dados.
//
// Cada loja tem o seu proprio "scraper" em lib/priceScrapers/. Lojas sem
// scraper ainda implementado, ou cuja pagina bloqueia pedidos vindos de um
// servidor (ver nota sobre a Foot Locker abaixo), sao simplesmente
// ignoradas nesta ronda (ver summary devolvido) - nunca se inventa um
// preco para uma loja que ainda nao sabemos ler com confianca.
//
// Nota sobre a Foot Locker: o scraper existe e foi validado manualmente,
// mas um pedido feito a partir do servidor da Vercel foi bloqueado pela
// Foot Locker (HTTP 429), mesmo tendo funcionado perfeitamente a partir de
// um browser real. Fica registado no scraper por si (pode voltar a
// funcionar, ou passar a funcionar com outra abordagem no futuro), mas por
// agora resolve sempre 0 resultados - o mesmo se aplica a Asics, New
// Balance, Vans, adidas e Zalando, que bloqueiam pedidos de servidor logo
// a primeira tentativa.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runFootLockerScraper } from '@/lib/priceScrapers/footlocker'
import { runCollectKicksScraper } from '@/lib/priceScrapers/collectkicks'
import { runNikeScraper } from '@/lib/priceScrapers/nike'
import { runJdSportsScraper } from '@/lib/priceScrapers/jdsports'
import type { ScraperTarget, ScraperResult } from '@/lib/priceScrapers/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SITE_URL = 'https://www.parjusto.pt'

// A About You fica de fora do registo por agora: o scraper existe e foi
// validado manualmente (o bloco ld+json standard tem preco e stock reais),
// mas um pedido feito a partir do servidor da Vercel recebe uma pagina do
// mesmo tamanho mas sem esse bloco (0 ocorrencias de "ld+json") - ainda por
// perceber porque, antes de voltar a liga-la aqui.
const SCRAPERS: Record<string, (targets: ScraperTarget[]) => Promise<ScraperResult[]>> = {
  'Foot Locker': runFootLockerScraper,
  CollectKicks: runCollectKicksScraper,
  'Nike Oficial': runNikeScraper,
  'JD Sports': runJdSportsScraper,
}

function isCronAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false // fail-closed: sem segredo configurado, nunca autoriza
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  return auth.slice('Bearer '.length) === expected
}

type StoreSummary = { attempted: number; resolved: number; note?: string }

// Apaga alertas de preço cujo prazo de "Expiração" (1 ou 2 meses, escolhido
// pelo utilizador ao criar o alerta - ver app/produto/[slug]/priceAlertActions.ts)
// já passou. Reaproveita este cron diário em vez de criar um agendamento
// novo só para isto. Nunca deixa uma falha aqui impedir a verificação de
// preços em si, que é o trabalho principal deste endpoint.
async function deleteExpiredPriceAlerts(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { error } = await supabase.from('price_alerts').delete().lt('expires_at', new Date().toISOString())
  if (error) {
    console.error('Falha ao apagar alertas de preço expirados:', error)
  }
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  }

  try {
    await deleteExpiredPriceAlerts()
  } catch (err) {
    console.error('Falha ao apagar alertas de preço expirados:', err)
  }

  const apiKey = process.env.PRICE_SYNC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'PRICE_SYNC_API_KEY nao configurada.' }, { status: 500 })
  }

  const targetsRes = await fetch(`${SITE_URL}/api/admin/price-check-targets`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (!targetsRes.ok) {
    return NextResponse.json({ error: `Falha ao obter alvos (${targetsRes.status}).` }, { status: 502 })
  }
  const { targets } = (await targetsRes.json()) as { targets: ScraperTarget[] }

  const byStore = new Map<string, ScraperTarget[]>()
  for (const t of targets) {
    const key = t.store_name ?? 'Desconhecida'
    if (!byStore.has(key)) byStore.set(key, [])
    byStore.get(key)!.push(t)
  }

  const allResults: ScraperResult[] = []
  const summary: Record<string, StoreSummary> = {}

  for (const [storeName, storeTargets] of byStore) {
    const scraper = SCRAPERS[storeName]
    if (!scraper) {
      summary[storeName] = {
        attempted: storeTargets.length,
        resolved: 0,
        note: 'Scraper ainda nao implementado para esta loja.',
      }
      continue
    }
    const results = await scraper(storeTargets)
    allResults.push(...results)
    summary[storeName] = { attempted: storeTargets.length, resolved: results.length }
  }

  if (allResults.length === 0) {
    return NextResponse.json({ summary, submitted: 0 })
  }

  const proposalsRes = await fetch(`${SITE_URL}/api/admin/price-check-proposals`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: allResults.map((r) => ({
        product_offer_id: r.product_offer_id,
        checked_price: r.checked_price,
        checked_available: r.checked_available,
        notes: r.notes ?? null,
      })),
    }),
  })

  if (!proposalsRes.ok) {
    const detail = await proposalsRes.text().catch(() => '')
    return NextResponse.json(
      { error: `Falha ao enviar propostas (${proposalsRes.status}).`, detail, summary },
      { status: 502 }
    )
  }

  const proposalsResult = await proposalsRes.json()
  return NextResponse.json({ summary, submitted: allResults.length, proposalsResult })
}
