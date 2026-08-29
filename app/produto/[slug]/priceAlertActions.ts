// app/produto/[slug]/priceAlertActions.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { resend, ALERTS_FROM_EMAIL } from '@/lib/resend'
import { SITE_URL } from '@/lib/siteUrl'
import { priceAlertConfirmationEmailHtml } from '@/lib/emailTemplates/priceAlertConfirmationEmail'

type CreatePriceAlertResult =
  | { success: true; alreadyConfirmed: boolean }
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
// de preço. Alertas novos exigem confirmação por e-mail antes de poderem
// disparar (ver lib/priceAlerts.ts) - evita alguém criar alertas com o
// e-mail de outra pessoa.
export async function createPriceAlert(
  productId: string,
  email: string,
  targetPrice: number
): Promise<CreatePriceAlertResult> {
  const trimmedEmail = email.trim().toLowerCase()

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { success: false, error: 'Introduz um e-mail válido.' }
  }
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    return { success: false, error: 'Introduz um preço válido.' }
  }

  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: 'Configuração em falta no servidor.' }

  const { data: product } = await supabase
    .from('products')
    .select('model_name, slug, image_url, brands (name)')
    .eq('id', productId)
    .single()

  if (!product) return { success: false, error: 'Produto não encontrado.' }

  const { data: existing } = await supabase
    .from('price_alerts')
    .select('id, confirmed_at, confirmation_token')
    .eq('product_id', productId)
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (existing) {
    const { error: updateError } = await supabase
      .from('price_alerts')
      .update({ target_price: targetPrice, is_active: true, last_notified_at: null })
      .eq('id', existing.id)

    if (updateError) return { success: false, error: 'Não foi possível atualizar o alerta. Tenta de novo.' }

    if (existing.confirmed_at) {
      return { success: true, alreadyConfirmed: true }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sendConfirmationEmail(trimmedEmail, existing.confirmation_token, product as any as ProductForEmail, targetPrice)
    return { success: true, alreadyConfirmed: false }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('price_alerts')
    .insert({ product_id: productId, email: trimmedEmail, target_price: targetPrice })
    .select('confirmation_token')
    .single()

  if (insertError || !inserted) {
    return { success: false, error: 'Não foi possível criar o alerta. Tenta de novo.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sendConfirmationEmail(trimmedEmail, inserted.confirmation_token, product as any as ProductForEmail, targetPrice)
  return { success: true, alreadyConfirmed: false }
}
