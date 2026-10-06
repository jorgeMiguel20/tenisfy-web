// app/api/cron/price-alerts/route.ts
//
// Verificação diária dos alertas de preço (ver vercel.json: corre todos os
// dias à noite, depois da verificação de preços das 20:07 no computador do
// Jorge). Os preços passaram a ser gravados diretamente na base de dados,
// por isso os alertas já não podem depender de alguém aprovar preços em
// /admin/precos - esta rota vê todos os alertas ativos e envia os e-mails
// que já devem sair (preço atingido ou tamanho de volta ao stock).
//
// Protegida pelo mesmo segredo do outro cron (CRON_SECRET, enviado pela
// própria Vercel no cabeçalho Authorization). Sem segredo configurado,
// nunca corre.

import { NextRequest, NextResponse } from 'next/server'
import { checkAllPriceAlerts } from '@/lib/priceAlerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isCronAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  return auth.slice('Bearer '.length) === expected
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  }

  try {
    const result = await checkAllPriceAlerts()
    return NextResponse.json(result)
  } catch (err) {
    console.error('Falha na verificação diária de alertas de preço:', err)
    return NextResponse.json({ error: 'Falha ao verificar alertas.' }, { status: 500 })
  }
}
