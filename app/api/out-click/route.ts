// app/api/out-click/route.ts
//
// Regista um clique em "Ver oferta" (ver components/OfferClickTracker.tsx)
// na tabela offer_clicks do Supabase (ver sql/offer_clicks.sql).
//
// Não guarda dados pessoais: nem IP, nem conta, nem browser - só o ténis, a
// loja, o sítio do botão e a hora. Robôs conhecidos e pedidos em excesso
// (mais de 30 cliques em 10 minutos da mesma ligação) não são contados.
// Responde sempre 204: contar o clique nunca pode dar erro a quem visita.

import { NextRequest } from 'next/server'
import { getServiceClient } from '@/lib/authServer'
import { checkRateLimit, fingerprint } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const PLACEMENTS = ['lista-lojas', 'barra-telemovel']
const SLUG_PATTERN = /^[a-z0-9-]{1,200}$/
const BOT_PATTERN = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|python|curl|wget/i

function noContent() {
  return new Response(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') ?? ''
    if (!userAgent || BOT_PATTERN.test(userAgent)) return noContent()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any
    try {
      body = await request.json()
    } catch {
      return noContent()
    }

    const product = String(body?.product ?? '').trim()
    const store = String(body?.store ?? '').trim()
    const placement = String(body?.placement ?? '').trim()
    if (!SLUG_PATTERN.test(product) || !store || store.length > 100 || !PLACEMENTS.includes(placement)) {
      return noContent()
    }

    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconhecido'
    const limit = await checkRateLimit(`click:${fingerprint(ip)}`, 30, 600)
    if (limit !== 'ok') return noContent()

    const supabase = getServiceClient()
    if (!supabase) return noContent()

    const { error } = await supabase
      .from('offer_clicks')
      .insert({ product_slug: product, store_name: store, placement })
    if (error) console.error('Falha ao registar clique em Ver oferta:', error.message)
  } catch (err) {
    console.error('Falha ao registar clique em Ver oferta:', err)
  }
  return noContent()
}
