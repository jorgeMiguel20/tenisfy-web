// app/api/admin/price-check-proposals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isPriceSyncAuthorized, checkPriceSanity } from '@/lib/priceSync'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

type IncomingItem = {
  product_offer_id: string
  checked_price: number | null
  checked_available: boolean | null
  notes?: string | null
}

type ItemResult = { product_offer_id: string | null; status: 'created' | 'updated' | 'failed'; error?: string }

function isValidItem(item: any): item is IncomingItem {
  if (!item || typeof item !== 'object') return false
  if (typeof item.product_offer_id !== 'string' || !item.product_offer_id) return false
  if (item.checked_price !== null && typeof item.checked_price !== 'number') return false
  if (item.checked_available !== null && typeof item.checked_available !== 'boolean') return false
  if (item.notes != null && typeof item.notes !== 'string') return false
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

  const items = Array.isArray(body) ? body : (body as any)?.items
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
    const proposalRow = {
      product_offer_id: item.product_offer_id,
      checked_price: item.checked_price,
      checked_available: item.checked_available,
      previous_price: offer.price,
      previous_in_stock: offer.in_stock,
      status: 'pending' as const,
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
      const { error: updateError } = await supabase
        .from('price_check_proposals')
        .update(proposalRow)
        .eq('id', existingPendingId)

      if (updateError) {
        results.push({ product_offer_id: item.product_offer_id, status: 'failed', error: updateError.message })
        continue
      }
      results.push({ product_offer_id: item.product_offer_id, status: 'updated' })
    } else {
      const { error: insertError } = await supabase
        .from('price_check_proposals')
        .insert({ ...proposalRow, first_flagged_at: now })

      if (insertError) {
        results.push({ product_offer_id: item.product_offer_id, status: 'failed', error: insertError.message })
        continue
      }
      results.push({ product_offer_id: item.product_offer_id, status: 'created' })
    }
  }

  return NextResponse.json({ results })
}
