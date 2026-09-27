// app/produto/[slug]/priceAlertActions.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { resend, ALERTS_FROM_EMAIL } from '@/lib/resend'
import { SITE_URL } from '@/lib/siteUrl'
import { priceAlertConfirmationEmailHtml } from '@/lib/emailTemplates/priceAlertConfirmationEmail'
import { getVerifiedUser } from '@/lib/authServer'

type CreatePriceAlertResult =
  // viaAccount: criado com sessão iniciada - ligado à conta e já ativo, sem
  // email de confirmação (entrar já provou que o email é da pessoa).
  | { success: true; alreadyConfirmed: boolean; viaAccount: boolean }
  | { success: false; error: string }

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ProductForEmail = {
  model_name: string
  slug: string
  image_url: string | null
  brands: { name: string } | null
}

async function sendConfirmationEmail(email: string, token: string, product: ProductForEmail, targetPrice: number) {
  if (!resend) return // sem Resend configurado - o alerta fica guardado, só por confirmar

  await resend.emails.send({
    from: ALERTS_FROM_EMAIL,
    to: email,
    subject: `Confirma o teu alerta de preço - ${product.model_name}`,
    html: priceAlertConfirmationEmailHtml({
      brandName: product.brands?.name ?? '',
      modelName: product.model_name,
      imageUrl: product.image_url,
      targetPrice,
      confirmUrl: `${SITE_URL}/alertas/confirmar?token=${token}`,
    }),
  })
}

// Cria (ou atualiza, se já existir para o mesmo e-mail+produto) um alerta
// de preço.
// - Sem sessão iniciada: como sempre - alertas novos exigem confirmação
//   por e-mail antes de poderem disparar (ver lib/priceAlerts.ts), para
//   ninguém criar alertas com o e-mail de outra pessoa.
// - Com sessão iniciada: usa o e-mail da conta (ignora o que vier do
//   formulário), liga o alerta à conta e fica logo ativo, sem e-mail de
//   confirmação - entrar na conta já exigiu abrir esse e-mail.
export async function createPriceAlert(
  productId: string,
  email: string,
  targetPrice: number,
  durationMonths: 1 | 2
): Promise<CreatePriceAlertResult> {
  const user = await getVerifiedUser()
  const accountEmail = user?.email ? user.email.toLowerCase() : null
  const trimmedEmail = accountEmail ?? email.trim().toLowerCase()

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { success: false, error: 'Introduz um e-mail válido.' }
  }
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    return { success: false, error: 'Introduz um preço válido.' }
  }
  if (durationMonths !== 1 && durationMonths !== 2) {
    return { success: false, error: 'Duração de expiração inválida.' }
  }

  // "Expiração": data a partir da qual o alerta é eliminado automaticamente
  // pelo cron diário (ver app/api/cron/price-check/route.ts) - pedido do
  // Jorge para o utilizador poder escolher 1 ou 2 meses.
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: 'Configuração em falta no servidor.' }

  const { data: product } = await supabase
    .from('products')
    .select('model_name, slug, image_url, brands (name)')
    .eq('id', productId)
    .single()

  if (!product) return { success: false, error: 'Produto não encontrado.' }

  // Campos extra quando há sessão: ligado à conta e já confirmado.
  const accountFields = user && accountEmail
    ? { user_id: user.id, confirmed_at: new Date().toISOString() }
    : {}

  const { data: existing } = await supabase
    .from('price_alerts')
    .select('id, confirmed_at, confirmation_token')
    .eq('product_id', productId)
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (existing) {
    const { error: updateError } = await supabase
      .from('price_alerts')
      .update({
        target_price: targetPrice,
        is_active: true,
        last_notified_at: null,
        expires_at: expiresAt.toISOString(),
        ...accountFields,
        // Um alerta já confirmado mantém a data original de confirmação.
        ...(existing.confirmed_at ? { confirmed_at: existing.confirmed_at } : {}),
      })
      .eq('id', existing.id)

    if (updateError) return { success: false, error: 'Não foi possível atualizar o alerta. Tenta de novo.' }

    if (accountEmail) return { success: true, alreadyConfirmed: true, viaAccount: true }

    if (existing.confirmed_at) {
      return { success: true, alreadyConfirmed: true, viaAccount: false }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sendConfirmationEmail(trimmedEmail, existing.confirmation_token, product as any as ProductForEmail, targetPrice)
    return { success: true, alreadyConfirmed: false, viaAccount: false }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('price_alerts')
    .insert({
      product_id: productId,
      email: trimmedEmail,
      target_price: targetPrice,
      expires_at: expiresAt.toISOString(),
      ...accountFields,
    })
    .select('confirmation_token')
    .single()

  if (insertError || !inserted) {
    return { success: false, error: 'Não foi possível criar o alerta. Tenta de novo.' }
  }

  if (accountEmail) return { success: true, alreadyConfirmed: true, viaAccount: true }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sendConfirmationEmail(trimmedEmail, inserted.confirmation_token, product as any as ProductForEmail, targetPrice)
  return { success: true, alreadyConfirmed: false, viaAccount: false }
}
