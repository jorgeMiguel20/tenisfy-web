// app/admin/precos/proposalActions.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkAndSendPriceAlerts } from '@/lib/priceAlerts'

type ActionResult = { success: true; count: number } | { success: false; error: string }

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

// Aprova 1+ propostas: escreve o preço/stock lido em product_offers (só o
// que veio preenchido - nunca apaga o preço atual só porque checked_price
// veio null), carimba last_checked_at (mesma lógica do botão manual) e
// regista um ponto em price_history para o histórico/gráfico continuarem a
// fazer sentido com esta via automática. Só depois marca a proposta como
// approved. needs_attention=true nunca passa por aqui - a UI não oferece
// este botão para essas linhas.
export async function approveProposals(proposalIds: string[]): Promise<ActionResult> {
  if (proposalIds.length === 0) return { success: true, count: 0 }

  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: 'Configuração do Supabase em falta no servidor.' }

  const { data: proposals, error: fetchError } = await supabase
    .from('price_check_proposals')
    .select('id, product_offer_id, checked_price, checked_available, status, product_offers (product_id)')
    .in('id', proposalIds)

  if (fetchError) return { success: false, error: fetchError.message }

  const toApprove = (proposals ?? []).filter((p) => p.status === 'pending')
  const now = new Date().toISOString()
  let approvedCount = 0

  // Produtos cujo preço mudou nesta aprovação - usado no fim para ver se
  // algum alerta de preço (ver lib/priceAlerts.ts) já pode disparar.
  const affectedProductIds: string[] = []

  for (const proposal of toApprove) {
    const offerUpdate: Record<string, unknown> = { last_checked_at: now }
    if (proposal.checked_price !== null) offerUpdate.price = proposal.checked_price
    if (proposal.checked_available !== null) offerUpdate.in_stock = proposal.checked_available

    const { error: offerError } = await supabase
      .from('product_offers')
      .update(offerUpdate)
      .eq('id', proposal.product_offer_id)

    if (offerError) {
      return { success: false, error: `Falhou a atualizar a oferta ${proposal.product_offer_id}: ${offerError.message}` }
    }

    if (proposal.checked_price !== null) {
      const { error: historyError } = await supabase.from('price_history').insert({
        product_offer_id: proposal.product_offer_id,
        price: proposal.checked_price,
        recorded_at: now,
      })
      if (historyError) {
        return { success: false, error: `Oferta atualizada, mas falhou o histórico: ${historyError.message}` }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productId = (proposal.product_offers as any)?.product_id
      if (productId) affectedProductIds.push(productId)
    }

    const { error: proposalError } = await supabase
      .from('price_check_proposals')
      .update({ status: 'approved', reviewed_at: now })
      .eq('id', proposal.id)

    if (proposalError) {
      return { success: false, error: `Oferta e histórico atualizados, mas falhou marcar a proposta: ${proposalError.message}` }
    }

    approvedCount++
  }

  // Alertas de preço (ver lib/priceAlerts.ts): nunca deixar uma falha aqui
  // impedir a resposta de sucesso - os preços já foram guardados acima, e
  // um alerta que falhe a enviar só fica por notificar até à próxima
  // aprovação deste produto.
  try {
    await checkAndSendPriceAlerts(affectedProductIds)
  } catch (err) {
    console.error('Falha ao verificar alertas de preço depois de aprovar propostas:', err)
  }

  revalidatePath('/admin/precos')
  return { success: true, count: approvedCount }
}

// Rejeitar: usa-se quando desconfias ativamente de que a leitura estava
// errada. Não toca em product_offers.
export async function rejectProposal(proposalId: string): Promise<ActionResult> {
  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: 'Configuração do Supabase em falta no servidor.' }

  const { error } = await supabase
    .from('price_check_proposals')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('status', 'pending')

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/precos')
  return { success: true, count: 1 }
}

// Marcar como resolvido: fecha uma proposta da secção "Precisa da tua
// atenção" sem confirmar nem infirmar a leitura, e sem tocar em
// product_offers - usa-se depois de teres confirmado tu à mão na loja.
export async function dismissProposal(proposalId: string): Promise<ActionResult> {
  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: 'Configuração do Supabase em falta no servidor.' }

  const { error } = await supabase
    .from('price_check_proposals')
    .update({ status: 'dismissed', reviewed_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('status', 'pending')

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/precos')
  return { success: true, count: 1 }
}

// Descontinuar oferta: usa-se quando a loja deixou mesmo de vender o
// produto. Carimba discontinued_at na oferta (nunca apaga a linha nem o
// price_history - fica só inativa) e fecha a proposta como dismissed, já
// que não faz sentido continuar a pedir para confirmar à mão uma oferta que
// já sabemos que acabou. GET /api/admin/price-check-targets exclui ofertas
// com discontinued_at preenchido, e a página do produto também as ignora -
// para reativar por engano, basta limpar discontinued_at diretamente na
// base de dados (sem botão próprio nesta ronda).
export async function discontinueOffer(proposalId: string, productOfferId: string): Promise<ActionResult> {
  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: 'Configuração do Supabase em falta no servidor.' }

  const now = new Date().toISOString()

  const { error: offerError } = await supabase
    .from('product_offers')
    .update({ discontinued_at: now })
    .eq('id', productOfferId)

  if (offerError) return { success: false, error: offerError.message }

  const { error: proposalError } = await supabase
    .from('price_check_proposals')
    .update({ status: 'dismissed', reviewed_at: now })
    .eq('id', proposalId)
    .eq('status', 'pending')

  if (proposalError) {
    return { success: false, error: `Oferta descontinuada, mas falhou fechar a proposta: ${proposalError.message}` }
  }

  revalidatePath('/admin/precos')
  revalidatePath('/produto/[slug]', 'page')
  return { success: true, count: 1 }
}
