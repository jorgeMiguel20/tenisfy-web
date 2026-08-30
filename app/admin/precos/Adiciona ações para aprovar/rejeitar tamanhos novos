// app/admin/precos/newSizeActions.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true; count: number } | { success: false; error: string }

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

// Aprova 1+ tamanhos novos: cria a linha em product_offers (nunca existia
// antes - ao contrário da aprovação de preços, que só actualiza uma oferta
// já existente) e um ponto inicial em price_history, para o histórico do
// produto já começar completo. Se o agente não conseguiu ler o preço deste
// tamanho específico (price null - acontece em lojas como a adidas.pt, onde
// a lista de tamanhos vem separada da disponibilidade/preço por tamanho),
// usa o preço já conhecido de outra oferta do mesmo produto na mesma loja -
// em calçado o preço não costuma variar por tamanho. Disponibilidade
// desconhecida (in_stock null) assume-se True: o tamanho apareceu como
// opção na página, e se estiver errado a verificação diária normal corrige
// já no dia seguinte (fica "precisa da tua atenção" se a leitura for
// suspeita).
export async function approveNewSizes(proposalIds: string[]): Promise<ActionResult> {
  if (proposalIds.length === 0) return { success: true, count: 0 }

  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: 'Configuração do Supabase em falta no servidor.' }

  const { data: proposals, error: fetchError } = await supabase
    .from('size_discovery_proposals')
    .select('id, product_id, store_id, size, url, price, in_stock, status')
    .in('id', proposalIds)

  if (fetchError) return { success: false, error: fetchError.message }

  const toApprove = (proposals ?? []).filter((p) => p.status === 'pending')
  const now = new Date().toISOString()
  let approvedCount = 0

  for (const proposal of toApprove) {
    let price = proposal.price
    let currency = 'EUR'

    if (price === null) {
      const { data: sibling } = await supabase
        .from('product_offers')
        .select('price, currency')
        .eq('product_id', proposal.product_id)
        .eq('store_id', proposal.store_id)
        .is('discontinued_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (sibling) {
        price = sibling.price
        currency = sibling.currency
      }
    }

    if (price === null) {
      return {
        success: false,
        error: `Não há preço conhecido para o tamanho ${proposal.size} (nem lido pelo agente, nem de outra oferta do mesmo produto nesta loja) - não é possível aprovar sem preço.`,
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('product_offers')
      .insert({
        product_id: proposal.product_id,
        store_id: proposal.store_id,
        size: proposal.size,
        price,
        currency,
        affiliate_url: proposal.url,
        in_stock: proposal.in_stock ?? true,
        last_checked_at: now,
        created_at: now,
      })
      .select('id')
      .single()

    if (insertError) {
      return { success: false, error: `Falhou a criar a oferta para o tamanho ${proposal.size}: ${insertError.message}` }
    }

    const { error: historyError } = await supabase.from('price_history').insert({
      product_offer_id: inserted.id,
      price,
      recorded_at: now,
    })
    if (historyError) {
      return { success: false, error: `Oferta criada, mas falhou o histórico: ${historyError.message}` }
    }

    const { error: proposalError } = await supabase
      .from('size_discovery_proposals')
      .update({ status: 'approved', reviewed_at: now })
      .eq('id', proposal.id)

    if (proposalError) {
      return { success: false, error: `Oferta criada, mas falhou marcar a proposta: ${proposalError.message}` }
    }

    approvedCount++
  }

  revalidatePath('/admin/precos')
  revalidatePath('/produto/[slug]', 'page')
  return { success: true, count: approvedCount }
}

// Rejeitar: usa-se quando não é mesmo um tamanho a vender (ex: erro de
// leitura da página, tamanho de criança misturado com adulto). Fica
// marcado como rejected e o endpoint /api/admin/size-discoveries deixa de
// voltar a propor esta combinação produto+loja+tamanho.
export async function rejectNewSize(proposalId: string): Promise<ActionResult> {
  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: 'Configuração do Supabase em falta no servidor.' }

  const { error } = await supabase
    .from('size_discovery_proposals')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('status', 'pending')

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/precos')
  return { success: true, count: 1 }
}
