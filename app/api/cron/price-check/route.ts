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
import { runFootLockerScraper } from '@/lib/priceScrapers/footlocker'
import { runAboutYouScraper } from '@/lib/priceScrapers/aboutyou'
import { runCollectKicksScraper } from '@/lib/priceScrapers/collectkicks'
import { runNikeScraper } from '@/lib/priceScrapers/nike'
import type { ScraperTarget, ScraperResult } from '@/lib/priceScrapers/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SITE_URL = 'https://www.parjusto.pt'

const SCRAPERS: Record<string, (targets: ScraperTarget[]) => Promise<ScraperResult[]>> = {
  'Foot Locker': runFootLockerScraper,
  'About You': runAboutYouScraper,
  CollectKicks: runCollectKicksScraper,
  'Nike Oficial': runNikeScraper,
}

function isCronAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false // fail-closed: sem segredo configurado, nunca autoriza
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  return auth.slice('Bearer '.length) === expected
}

type StoreSummary = { attempted: number; resolved: number; note?: string }

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
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

  // Modo de diagnostico temporario, restrito aos URLs reais da About You
  // (nunca aceita um URL a escolha de quem chama, para nao abrir uma porta
  // de SSRF): /api/cron/price-check?debug=aboutyou
  if (request.nextUrl.searchParams.get('debug') === 'aboutyou') {
    const ayUrls = [...new Set(targets.filter((t) => t.store_name === 'About You').map((t) => t.url))]
    const diagnostics = await Promise.all(
      ayUrls.map(async (u) => {
        try {
          const r = await fetch(u, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
            },
            cache: 'no-store',
          })
          const h = await r.text()
          const ldCount = (h.match(/application\/ld\+json/g) || []).length
          const hasProductGroup = h.includes('ProductGroup')
          return { url: u, status: r.status, htmlLength: h.length, ldCount, hasProductGroup }
        } catch (err: any) {
          return { url: u, error: String(err?.message ?? err) }
        }
      })
    )
    return NextResponse.json({ diagnostics })
  }

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
