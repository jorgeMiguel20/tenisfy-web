// app/api/admin/size-discoveries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isPriceSyncAuthorized } from '@/lib/priceSync'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

type IncomingItem = {
  product_id: string
  store_id: string
  size: string
  url: string
  price: number | null
  in_stock: boolean | null
}

type ItemResult = { product_id: string | null; store_id: string | null; size: string | null; status: string; error?: string }

function isValidItem(item: any): item is IncomingItem {
  if (!item || typeof item !== 'object') return false
  if (typeof item.product_id !== 'string' || !item.product_id) return false
  if (typeof item.store_id !== 'string' || !item.store_id) return false
  if (typeof item.size !== 'string' || !item.size) return false
  if (typeof item.url !== 'string' || !item.url) return false
  if (item.price !== undefined && item.price !== null && typeof item.price !== 'number') return false
  if (item.in_stock !== undefined && item.in_stock !== null && typeof item.in_stock !== 'boolean') return false
  return true
}

// Nunca escreve em product_offers - só cria/actualiza propostas em
// size_discovery_proposals para o Jorge rever em /admin/precos. Uma vez que
// uma proposta é rejeitada ou aprovada, não volta a ser reposta a pending
// automaticamente por este endpoint (ao contrário das propostas de
// preço/stock, onde flutuações diárias justificam repetir) - uma decisão
// sobre "isto é mesmo um tamanho a vender" não deve voltar a incomodar o
// Jorge todos os dias só porque o agente voltou a ver o mesmo tamanho na
// página. Para reabrir, é preciso mexer directamente na base de dados (sem
// botão próprio nesta ronda, mesmo padrão de "reactivar oferta
// descontinuada" em proposalActions.ts).
export async function POST(request: NextRequest) {
  if (!isPriceSyncAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const items = Array.isArray(body) ? body : (body as any)?.items
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Esperado um array de tamanhos encontrados (ou { items: [...] }).' }, { status: 400 })
  }

  const results: ItemResult[] = []
  const validItems: IncomingItem[] = []

  for (const raw of items) {
    if (!isValidItem(raw)) {
      results.push({
        product_id: typeof raw?.product_id === 'string' ? raw.product_id : null,
        store_id: typeof raw?.store_id === 'string' ? raw.store_id : null,
        size: typeof raw?.size === 'string' ? raw.size : null,
        status: 'failed',
        error: 'Formato inválido (product_id/store_id/size/url/price/in_stock).',
      })
      continue
    }
    validItems.push(raw)
  }

  if (validItems.length === 0) {
    return NextResponse.json({ results })
  }

  const productIds = [...new Set(validItems.map((i) => i.product_id))]

  // Defesa contra corrida: se entretanto o tamanho já foi aprovado e existe
  // em product_offers (ex: o Jorge aprovou ontem e o agente ainda não tinha
  // a lista actualizada), não criar proposta nenhuma - já não é novidade.
  const { data: existingOffers, error: offersError } = await supabase
    .from('product_offers')
    .select('product_id, store_id, size')
    .in('product_id', productIds)
    .is('discontinued_at', null)

  if (offersError) {
    return NextResponse.json({ error: offersError.message }, { status: 500 })
  }

  const existingOfferKeys = new Set((existingOffers ?? []).map((o) => `${o.product_id}::${o.store_id}::${o.size}`))

  const { data: existingProposals, error: proposalsError } = await supabase
    .from('size_discovery_proposals')
    .select('id, product_id, store_id, size, status')
    .in('product_id', productIds)

  if (proposalsError) {
    return NextResponse.json({ error: proposalsError.message }, { status: 500 })
  }

  const proposalByKey = new Map(
    (existingProposals ?? []).map((p) => [`${p.product_id}::${p.store_id}::${p.size}`, p])
  )

  const now = new Date().toISOString()

  for (const item of validItems) {
    const key = `${item.product_id}::${item.store_id}::${item.size}`

    if (existingOfferKeys.has(key)) {
      results.push({ product_id: item.product_id, store_id: item.store_id, size: item.size, status: 'already_exists' })
      continue
    }

    const existingProposal = proposalByKey.get(key)

    if (existingProposal) {
      if (existingProposal.status !== 'pending') {
        results.push({
          product_id: item.product_id,
          store_id: item.store_id,
          size: item.size,
          status: 'skipped_previous_decision',
        })
        continue
      }

      const { error: updateError } = await supabase
        .from('size_discovery_proposals')
        .update({ url: item.url, price: item.price ?? null, in_stock: item.in_stock ?? null, last_seen_at: now })
        .eq('id', existingProposal.id)

      if (updateError) {
        results.push({ product_id: item.product_id, store_id: item.store_id, size: item.size, status: 'failed', error: updateError.message })
        continue
      }
      results.push({ product_id: item.product_id, store_id: item.store_id, size: item.size, status: 'updated' })
    } else {
      const { error: insertError } = await supabase.from('size_discovery_proposals').insert({
        product_id: item.product_id,
        store_id: item.store_id,
        size: item.size,
        url: item.url,
        price: item.price ?? null,
        in_stock: item.in_stock ?? null,
        status: 'pending',
        first_seen_at: now,
        last_seen_at: now,
      })

      if (insertError) {
        results.push({ product_id: item.product_id, store_id: item.store_id, size: item.size, status: 'failed', error: insertError.message })
        continue
      }
      results.push({ product_id: item.product_id, store_id: item.store_id, size: item.size, status: 'created' })
    }
  }

  return NextResponse.json({ results })
}
