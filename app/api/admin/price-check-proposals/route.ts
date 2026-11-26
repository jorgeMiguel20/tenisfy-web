// app/api/admin/price-check-proposals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isPriceSyncAuthorized, checkPriceSanity } from '@/lib/priceSync'

// A verificação diária envia centenas de propostas de uma vez. Antes cada uma
// era gravada num pedido separado à base de dados (centenas de pedidos
// seguidos), o que demorava quase um minuto e fazia a tarefa das 06:01 esgotar
// os 60 s da Vercel. Agora as propostas novas entram em lotes e as
// atualizações correm em paralelo. O resultado é o mesmo.
export const maxDuration = 60

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const INSERT_CHUNK = 200
const UPDATE_PARALLEL = 20

type IncomingItem = {
  product_offer_id: string
  checked_price: number | null
  checked_available: boolean | null
  notes?: string | null
}

type ItemResult = { product_offer_id: string | null; status: 'created' | 'updated' | 'failed'; error?: string }

function isValidItem(item: unknown): item is IncomingItem {
  if (!item || typeof item !== 'object') return false
  const i = item as Record<string, unknown>
  if (typeof i.product_offer_id !== 'string' || !i.product_offer_id) return false
  if (i.checked_price !== null && typeof i.checked_price !== 'number') return false
  if (i.checked_available !== null && typeof i.checked_available !== 'boolean') return false
  if (i.notes != null && typeof i.notes !== 'string') return false
  return true
}

// Nunca escreve em product_offers - só cria/atualiza propostas em
// price_check_proposals para o Jorge rever em /admin/precos. Cada item do
// array é processado de forma independente: um product_offer_id inválido
// não impede os restantes itens válidos do mesmo pedido.
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

  const items = Array.isArray(body) ? body : (body as { items?: unknown } | null)?.items
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Esperado um array de resultados (ou { items: [...] }).' }, { status: 400 })
  }

  const results: ItemResult[] = []
  const validItems: IncomingItem[] = []

  for (const raw of items) {
    if (!isValidItem(raw)) {
      results.push({
        product_offer_id: typeof raw?.product_offer_id === 'string' ? raw.product_offer_id : null,
        status: 'failed',
        error: 'Formato inválido (product_offer_id/checked_price/checked_available/notes).',
      })
      continue
    }
    validItems.push(raw)
  }

  if (validItems.length === 0) {
    return NextResponse.json({ results }, { status: 200 })
  }

  const offerIds = [...new Set(validItems.map((i) => i.product_offer_id))]

  const { data: offers, error: offersError } = await supabase
    .from('product_offers')
    .select('id, price, in_stock')
    .in('id', offerIds)

  if (offersError) {
    return NextResponse.json({ error: offersError.message }, { status: 500 })
  }

  const offerById = new Map((offers ?? []).map((o) => [o.id, o]))

  const { data: pendingProposals, error: pendingError } = await supabase
    .from('price_check_proposals')
    .select('id, product_offer_id')
    .in('product_offer_id', offerIds)
    .eq('status', 'pending')

  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 })
  }

  const pendingByOfferId = new Map((pendingProposals ?? []).map((p) => [p.product_offer_id, p.id]))

  const toInsert: { productOfferId: string; row: Record<string, unknown> }[] = []
  const toUpdate: { productOfferId: string; id: string; row: Record<string, unknown> }[] = []

  for (const item of validItems) {
    const offer = offerById.get(item.product_offer_id)

    if (!offer) {
      results.push({
        product_offer_id: item.product_offer_id,
        status: 'failed',
        error: 'product_offer_id não encontrado (inválido ou removido).',
      })
      continue
    }

    // Caso 3 do pedido (incerto): disponibilidade não determinada -
    // precisa sempre de atenção manual, nunca segue para aprovação normal.
    let needsAttention = item.checked_available === null
    const noteParts: string[] = []
    if (item.notes) noteParts.push(item.notes)

    if (item.checked_price !== null) {
      const sanity = checkPriceSanity(offer.price, item.checked_price)
      if (sanity.suspicious) {
        needsAttention = true
        if (sanity.reason) noteParts.push(sanity.reason)
      }
    }

    const now = new Date().toISOString()
    const proposalRow: Record<string, unknown> = {
      product_offer_id: item.product_offer_id,
      checked_price: item.checked_price,
      checked_available: item.checked_available,
      previous_price: offer.price,
      previous_in_stock: offer.in_stock,
      status: 'pending',
      needs_attention: needsAttention,
      notes: noteParts.length > 0 ? noteParts.join(' ') : null,
      checked_at: now,
      reviewed_at: null,
    }

    const existingPendingId = pendingByOfferId.get(item.product_offer_id)

    if (existingPendingId) {
      // Nunca tocar em first_flagged_at aqui - é a data em que o problema
      // apareceu pela primeira vez, usada em /admin/precos para mostrar "há
      // quantos dias" está por resolver. Atualizar a proposta existente não
      // deve "rejuvenescê-la".
      toUpdate.push({ productOfferId: item.product_offer_id, id: existingPendingId, row: proposalRow })
    } else {
      toInsert.push({ productOfferId: item.product_offer_id, row: { ...proposalRow, first_flagged_at: now } })
    }
  }

  // Propostas novas: em lotes. Se um lote falhar, tenta uma a uma para que
  // uma linha má não impeça as restantes.
  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK)
    const { error: batchError } = await supabase.from('price_check_proposals').insert(chunk.map((c) => c.row))
    if (!batchError) {
      for (const c of chunk) results.push({ product_offer_id: c.productOfferId, status: 'created' })
      continue
    }
    for (const c of chunk) {
      const { error: insertError } = await supabase.from('price_check_proposals').insert(c.row)
      if (insertError) {
        results.push({ product_offer_id: c.productOfferId, status: 'failed', error: insertError.message })
      } else {
        results.push({ product_offer_id: c.productOfferId, status: 'created' })
      }
    }
  }

  // Propostas já pendentes: atualizadas em paralelo, UPDATE_PARALLEL de cada vez.
  for (let i = 0; i < toUpdate.length; i += UPDATE_PARALLEL) {
    const chunk = toUpdate.slice(i, i + UPDATE_PARALLEL)
    const outcomes = await Promise.all(
      chunk.map(async (u): Promise<ItemResult> => {
        const { error: updateError } = await supabase.from('price_check_proposals').update(u.row).eq('id', u.id)
        if (updateError) {
          return { product_offer_id: u.productOfferId, status: 'failed', error: updateError.message }
        }
        return { product_offer_id: u.productOfferId, status: 'updated' }
      })
    )
    results.push(...outcomes)
  }

  return NextResponse.json({ results })
}
