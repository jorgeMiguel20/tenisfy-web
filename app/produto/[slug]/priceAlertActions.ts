// app/produto/[slug]/priceAlertActions.ts
'use server'

import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { resend, ALERTS_FROM_EMAIL } from '@/lib/resend'
import { SITE_URL } from '@/lib/siteUrl'
import { priceAlertConfirmationEmailHtml } from '@/lib/emailTemplates/priceAlertConfirmationEmail'
import { getVerifiedUser } from '@/lib/authServer'
import { checkRateLimit, clientFingerprint, fingerprint } from '@/lib/rateLimit'

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
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_EMAIL_LENGTH = 254
const MAX_TARGET_PRICE = 100000 // euros - acima disto é engano ou abuso
const MAX_ALERTS_PER_ACCOUNT = 50

// Limites de pedidos (ver lib/rateLimit.ts). Só se aplicam a quem NÃO tem
// sessão iniciada, porque é aí que o site envia um email a um endereço
// que pode não ser de quem está a pedir.
const IP_MAX_ATTEMPTS = 10 // pedidos de alerta por hora, por pessoa
const EMAIL_MAX_CONFIRMATIONS = 3 // emails de confirmação por hora, por endereço
const GLOBAL_MAX_CONFIRMATIONS = 60 // emails de confirmação por hora, no site todo
const RESEND_COOLDOWN_SECONDS = 600 // reenvio da confirmação do mesmo alerta: 10 min

const ERROR_TOO_MANY_REQUESTS = 'Fizeste muitos pedidos seguidos. Tenta de novo daqui a uma hora.'
const ERROR_UNAVAILABLE = 'Não foi possível criar o alerta agora. Tenta de novo daqui a pouco.'
const ERROR_RECENT_CONFIRMATION =
  'Já te enviámos um email de confirmação há pouco. Verifica a caixa de entrada (e o spam) ou tenta de novo daqui a alguns minutos.'
const ERROR_TOO_MANY_EMAILS =
  'Já foram enviados vários emails para este endereço. Tenta de novo mais tarde.'

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

// Confirma que ainda cabe mais um email de confirmação para este alerta,
// este endereço e o site todo (um limite de cada vez, do mais específico
// para o mais geral). Devolve a mensagem de erro a mostrar, ou null se
// pode enviar.
async function checkConfirmationEmailLimits(
  email: string,
  existingAlertId: string | null
): Promise<string | null> {
  if (existingAlertId) {
    const result = await checkRateLimit(`alert-mail-alert:${existingAlertId}`, 1, RESEND_COOLDOWN_SECONDS)
    if (result === 'error') return ERROR_UNAVAILABLE
    if (result === 'limited') return ERROR_RECENT_CONFIRMATION
  }

  const perEmail = await checkRateLimit(
    `alert-mail-email:${fingerprint(email)}`,
    EMAIL_MAX_CONFIRMATIONS,
    3600
  )
  if (perEmail === 'error') return ERROR_UNAVAILABLE
  if (perEmail === 'limited') return ERROR_TOO_MANY_EMAILS

  const global = await checkRateLimit('alert-mail-global', GLOBAL_MAX_CONFIRMATIONS, 3600)
  if (global === 'error' || global === 'limited') return ERROR_UNAVAILABLE

  return null
}

// Cria (ou atualiza, se já existir para o mesmo e-mail+produto) um alerta
// de preço.
// - Sem sessão iniciada: como sempre - alertas novos exigem confirmação
//   por e-mail antes de poderem disparar (ver lib/priceAlerts.ts), para
//   ninguém criar alertas com o e-mail de outra pessoa. Há limites de
//   pedidos para ninguém usar isto para encher a caixa de email de outra
//   pessoa nem para gastar o limite de envios do Resend.
// - Com sessão iniciada: usa o e-mail da conta (ignora o que vier do
//   formulário), liga o alerta à conta e fica logo ativo, sem e-mail de
//   confirmação - entrar na conta já exigiu abrir esse e-mail.
export async function createPriceAlert(
  productId: string,
  email: string,
  targetPrice: number,
  durationMonths: 1 | 2
): Promise<CreatePriceAlertResult> {
  // Uma Server Action pode receber qualquer coisa vinda de fora, mesmo que
  // o formulário do site só envie texto e números.
  if (typeof productId !== 'string' || !UUID_REGEX.test(productId)) {
    return { success: false, error: 'Produto não encontrado.' }
  }
  if (typeof email !== 'string') {
    return { success: false, error: 'Introduz um e-mail válido.' }
  }
  if (typeof targetPrice !== 'number' || !Number.isFinite(targetPrice) || targetPrice <= 0) {
    return { success: false, error: 'Introduz um preço válido.' }
  }
  if (targetPrice > MAX_TARGET_PRICE) {
    return { success: false, error: 'O preço máximo para um alerta é 100 000 €.' }
  }
  if (durationMonths !== 1 && durationMonths !== 2) {
    return { success: false, error: 'Duração de expiração inválida.' }
  }

  const user = await getVerifiedUser()
  const accountEmail = user?.email ? user.email.toLowerCase() : null
  const trimmedEmail = accountEmail ?? email.trim().toLowerCase()

  if (trimmedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(trimmedEmail)) {
    return { success: false, error: 'Introduz um e-mail válido.' }
  }

  // Limite por pessoa (IP): só sem sessão iniciada.
  if (!accountEmail) {
    const ipResult = await checkRateLimit(
      `alert-ip:${clientFingerprint(await headers())}`,
      IP_MAX_ATTEMPTS,
      3600
    )
    if (ipResult === 'limited') return { success: false, error: ERROR_TOO_MANY_REQUESTS }
    if (ipResult === 'error') return { success: false, error: ERROR_UNAVAILABLE }
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

  const { data: existing } = await supabase
    .from('price_alerts')
    .select('id, confirmed_at, confirmation_token')
    .eq('product_id', productId)
    .eq('email', trimmedEmail)
    .maybeSingle()

  // Com sessão: máximo de alertas por conta (para uma conta não encher a
  // base de dados). Atualizar um alerta que já existe não conta.
  if (user && accountEmail && !existing) {
    const { count } = await supabase
      .from('price_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= MAX_ALERTS_PER_ACCOUNT) {
      return {
        success: false,
        error: `Já tens ${MAX_ALERTS_PER_ACCOUNT} alertas. Apaga alguns em "A minha conta" para criares novos.`,
      }
    }
  }

  // Sem sessão e o alerta ainda não está confirmado: vai ser enviado um
  // email de confirmação, por isso confirma os limites ANTES de guardar.
  const needsConfirmationEmail = !accountEmail && !existing?.confirmed_at
  if (needsConfirmationEmail) {
    const limitError = await checkConfirmationEmailLimits(trimmedEmail, existing?.id ?? null)
    if (limitError) return { success: false, error: limitError }
  }

  // Campos extra quando há sessão: ligado à conta e já confirmado.
  const accountFields = user && accountEmail
    ? { user_id: user.id, confirmed_at: new Date().toISOString() }
    : {}

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
