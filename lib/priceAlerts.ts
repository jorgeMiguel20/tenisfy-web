// lib/priceAlerts.ts
import { createClient } from '@supabase/supabase-js'
import { resend, ALERTS_FROM_EMAIL } from './resend'
import { SITE_URL } from './siteUrl'
import { formatPrice } from './formatPrice'
import { sizesMatch } from './sizeSort'
import { priceAlertEmailHtml } from './emailTemplates/priceAlertEmail'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

// ---------------------------------------------------------------------------
// TRAVÕES DE SEGURANÇA (pedido do Jorge, 7 out 2026)
//
// Um erro de catálogo numa loja (ex.: preço a 0 € ou a 9 €) nunca pode
// disparar e-mails falsos de "o preço baixou". Antes de enviar, cada alerta
// passa por dois travões:
//
// 1. Preço suspeito: se o preço novo for menos de METADE da mediana dos
//    últimos 30 dias deste ténis, o alerta fica retido.
// 2. Demasiados alertas de uma vez: se uma só verificação quiser enviar mais
//    do que MAX_ALERTS_PER_RUN e-mails, não envia NENHUM - ficam todos
//    retidos. Muitos alertas ao mesmo tempo quase sempre significam um erro.
//
// Os alertas retidos continuam ativos (não se perdem). Aparecem em
// /admin/precos, secção "Alertas retidos", onde o Jorge confirma o preço na
// loja e carrega em "Enviar". O Jorge recebe também um e-mail de aviso, se
// a variável ADMIN_ALERTS_EMAIL estiver definida na Vercel.
//
// (Já existe um primeiro travão antes disto: a função apply_price_check no
// Supabase recusa preços abaixo de 5 € e variações acima de 50 %.)
// ---------------------------------------------------------------------------

const SUSPICIOUS_RATIO = 0.5 // menos de metade da mediana = suspeito
const REFERENCE_DAYS = 30 // mediana calculada sobre os últimos 30 dias
const MIN_REFERENCE_POINTS = 3 // sem histórico suficiente não há comparação
const DEFAULT_MAX_ALERTS_PER_RUN = 20

function maxAlertsPerRun(): number {
  const fromEnv = Number(process.env.ALERTS_MAX_PER_RUN)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? Math.floor(fromEnv) : DEFAULT_MAX_ALERTS_PER_RUN
}

type OfferForAlert = { size: string; price: number }

// Ofertas com stock de um produto, nas lojas ativas (o mesmo critério do
// resto do site: nunca conta ofertas descontinuadas nem lojas desligadas).
async function getInStockOffers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  productId: string
): Promise<OfferForAlert[]> {
  const { data } = await supabase
    .from('product_offers')
    .select('size, price, stores!inner (is_active)')
    .eq('product_id', productId)
    .eq('in_stock', true)
    .is('discontinued_at', null)
    .eq('stores.is_active', true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((o) => ({ size: String(o.size ?? ''), price: Number(o.price) }))
}

// Preço de referência de um ténis: mediana de todos os preços registados em
// price_history nos últimos 30 dias (todas as lojas e tamanhos). Ignora as
// últimas 12 horas, para o próprio preço suspeito não "puxar" a referência.
// Devolve null quando há poucos registos para comparar.
async function getReferencePrice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  productId: string
): Promise<number | null> {
  const { data: offers } = await supabase.from('product_offers').select('id').eq('product_id', productId)
  const offerIds = ((offers ?? []) as { id: string }[]).map((o) => o.id)
  if (offerIds.length === 0) return null

  const since = new Date(Date.now() - REFERENCE_DAYS * 86_400_000).toISOString()
  const until = new Date(Date.now() - 12 * 3_600_000).toISOString()

  const { data: rows } = await supabase
    .from('price_history')
    .select('price')
    .in('product_offer_id', offerIds)
    .gte('recorded_at', since)
    .lt('recorded_at', until)

  const prices = ((rows ?? []) as { price: number }[])
    .map((r) => Number(r.price))
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b)

  if (prices.length < MIN_REFERENCE_POINTS) return null
  const middle = Math.floor(prices.length / 2)
  return prices.length % 2 === 1 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2
}

type AlertRow = {
  id: string
  email: string
  target_price: number
  size: string | null
  notify_restock: boolean
  unsubscribe_token: string
  products: { model_name: string; slug: string; image_url: string | null; brands: { name: string } | null } | null
}

// Decide se um alerta deve disparar agora, e porquê.
// - Sem tamanho: o preço mais baixo (qualquer tamanho com stock) chegou ao
//   valor pedido.
// - Com tamanho: o mesmo, mas só conta esse tamanho (ou o equivalente
//   noutra loja, ex. 42.5 = 42 2/3 - ver sizesMatch).
// - "Avisar quando voltar": com tamanho e notify_restock, basta esse
//   tamanho voltar a ter stock, a qualquer preço.
export function evaluateAlert(
  alert: { target_price: number; size: string | null; notify_restock: boolean },
  offers: OfferForAlert[]
): { kind: 'price' | 'restock'; price: number } | null {
  const matching = alert.size ? offers.filter((o) => sizesMatch(o.size, alert.size as string)) : offers
  if (matching.length === 0) return null

  const best = Math.min(...matching.map((o) => o.price))
  if (best <= Number(alert.target_price)) return { kind: 'price', price: best }
  if (alert.size && alert.notify_restock) return { kind: 'restock', price: best }
  return null
}

export type HoldReason = 'suspicious_price' | 'too_many'

// Um alerta que já devia disparar, com o resultado dos travões.
type AlertCandidate = {
  alertId: string
  productId: string
  email: string
  kind: 'price' | 'restock'
  price: number
  targetPrice: number
  referencePrice: number | null
  size: string | null
  productName: string
  productSlug: string
  holdReason: HoldReason | null
  alert: AlertRow
}

// Passo 1: encontra todos os alertas que já deviam disparar e aplica os
// travões. NÃO envia nada - serve também para a página /admin/precos
// mostrar os alertas retidos.
async function findAlertCandidates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  productIds: string[]
): Promise<AlertCandidate[]> {
  const uniqueProductIds = Array.from(new Set(productIds)).filter(Boolean)
  const nowIso = new Date().toISOString()
  const candidates: AlertCandidate[] = []

  for (const productId of uniqueProductIds) {
    try {
      const { data: alerts } = await supabase
        .from('price_alerts')
        .select('id, email, target_price, size, notify_restock, unsubscribe_token, expires_at, products(model_name, slug, image_url, brands(name))')
        .eq('product_id', productId)
        .eq('is_active', true)
        .not('confirmed_at', 'is', null)
        .is('last_notified_at', null)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

      if (!alerts || alerts.length === 0) continue

      const offers = await getInStockOffers(supabase, productId)
      if (offers.length === 0) continue

      let referencePrice: number | null | undefined // só se calcula se for preciso

      for (const alert of alerts as unknown as AlertRow[]) {
        const result = evaluateAlert(alert, offers)
        if (!result) continue

        if (referencePrice === undefined) referencePrice = await getReferencePrice(supabase, productId)

        // Travão 1: preço suspeito. Aplica-se também aos avisos de "voltou
        // a ter stock" - um preço absurdo pode ser o mesmo erro de catálogo.
        const suspicious = referencePrice != null && result.price < referencePrice * SUSPICIOUS_RATIO

        const product = alert.products
        candidates.push({
          alertId: alert.id,
          productId,
          email: alert.email,
          kind: result.kind,
          price: result.price,
          targetPrice: Number(alert.target_price),
          referencePrice: referencePrice ?? null,
          size: alert.size,
          productName: `${product?.brands?.name ?? ''} ${product?.model_name ?? ''}`.trim() || 'Ténis',
          productSlug: product?.slug ?? '',
          holdReason: suspicious ? 'suspicious_price' : null,
          alert,
        })
      }
    } catch (err) {
      console.error(`Falha ao verificar alertas de preço do produto ${productId}:`, err)
    }
  }

  // Travão 2: demasiados alertas de uma vez - retém todos.
  const toSend = candidates.filter((c) => c.holdReason === null)
  if (toSend.length > maxAlertsPerRun()) {
    for (const c of toSend) c.holdReason = 'too_many'
  }

  return candidates
}

// Envia o e-mail de um alerta e desativa-o (cada alerta só notifica uma
// vez - o utilizador pode sempre criar um novo).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendAlertEmail(supabase: any, c: AlertCandidate): Promise<boolean> {
  if (!resend) return false
  const product = c.alert.products
  const modelName = product?.model_name ?? 'ténis'
  const sizeText = c.size ? ` no tamanho ${c.size}` : ''
  const subject =
    c.kind === 'restock'
      ? `O ${modelName}${sizeText} voltou a ter stock (${formatPrice(c.price)})`
      : `O preço do ${modelName}${sizeText} desceu para ${formatPrice(c.price)}`

  try {
    await resend.emails.send({
      from: ALERTS_FROM_EMAIL,
      to: c.email,
      subject,
      html: priceAlertEmailHtml({
        kind: c.kind,
        brandName: product?.brands?.name ?? '',
        modelName: product?.model_name ?? '',
        imageUrl: product?.image_url ?? null,
        size: c.size,
        price: c.price,
        targetPrice: c.targetPrice,
        productUrl: `${SITE_URL}/produto/${product?.slug}`,
        unsubscribeUrl: `${SITE_URL}/alertas/cancelar?token=${c.alert.unsubscribe_token}`,
      }),
    })

    await supabase
      .from('price_alerts')
      .update({ last_notified_at: new Date().toISOString(), is_active: false })
      .eq('id', c.alertId)

    return true
  } catch (err) {
    console.error(`Falha ao enviar alerta de preço (alerta ${c.alertId}, produto ${c.productId}):`, err)
    return false
  }
}

function holdReasonText(reason: HoldReason): string {
  return reason === 'suspicious_price'
    ? 'Preço com menos de metade do habitual'
    : `Mais de ${maxAlertsPerRun()} alertas de uma vez`
}

// Aviso ao Jorge quando há alertas retidos. Só envia se ADMIN_ALERTS_EMAIL
// estiver definida na Vercel; sem ela, fica só registado nos logs.
async function notifyAdminAboutHeld(held: AlertCandidate[]): Promise<void> {
  if (held.length === 0) return
  console.warn(`Alertas de preço retidos pelos travões de segurança: ${held.length}`)
  const adminEmail = process.env.ADMIN_ALERTS_EMAIL
  if (!adminEmail || !resend) return

  const rows = held
    .map(
      (c) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${c.productName}${c.size ? ` · tam. ${c.size}` : ''}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;"><strong>${formatPrice(c.price)}</strong></td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${c.referencePrice != null ? formatPrice(c.referencePrice) : '-'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${c.holdReason ? holdReasonText(c.holdReason) : ''}</td>
        </tr>`
    )
    .join('')

  try {
    await resend.emails.send({
      from: ALERTS_FROM_EMAIL,
      to: adminEmail,
      subject: `Parjusto: ${held.length} alerta(s) de preço retido(s) - confirma antes de enviar`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#17232B;">
        <p>Os travões de segurança retiveram ${held.length} alerta(s) de preço. Nenhum destes e-mails foi enviado aos utilizadores.</p>
        <p>Confirma os preços nas lojas. Se estiverem certos, envia os alertas em
        <a href="${SITE_URL}/admin/precos">${SITE_URL}/admin/precos</a> (secção "Alertas retidos").
        Se forem um erro da loja, não faças nada - os alertas ficam à espera.</p>
        <table style="border-collapse:collapse;font-size:13px;">
          <tr><th align="left" style="padding:6px 8px;">Ténis</th><th align="left" style="padding:6px 8px;">Preço novo</th><th align="left" style="padding:6px 8px;">Habitual (mediana 30 dias)</th><th align="left" style="padding:6px 8px;">Motivo</th></tr>
          ${rows}
        </table>
      </div>`,
    })
  } catch (err) {
    console.error('Falha ao enviar o aviso de alertas retidos ao admin:', err)
  }
}

export type AlertRunResult = { products: number; sent: number; held: number }

// Verifica e envia os alertas dos produtos indicados.
// - options.forceAlertIds: alertas que o Jorge confirmou em /admin/precos;
//   estes saltam os travões, e só estes são enviados nessa chamada.
//
// Chamado depois de aprovar preços em /admin/precos, todos os dias pela
// verificação automática (app/api/cron/price-alerts/route.ts) e pelo botão
// "Enviar" dos alertas retidos. Uma falha aqui nunca impede o resto: um
// alerta que falhe a enviar fica por notificar e volta a ser tentado.
export async function checkAndSendPriceAlerts(
  productIds: string[],
  options: { forceAlertIds?: string[] } = {}
): Promise<AlertRunResult> {
  const supabase = getServiceClient()
  if (!supabase || !resend) return { products: 0, sent: 0, held: 0 } // sem configuração, não tenta enviar

  const candidates = await findAlertCandidates(supabase, productIds)
  const forced = options.forceAlertIds ? new Set(options.forceAlertIds) : null

  let sent = 0
  const held: AlertCandidate[] = []

  for (const c of candidates) {
    if (forced) {
      if (forced.has(c.alertId) && (await sendAlertEmail(supabase, c))) sent++
      continue
    }
    if (c.holdReason) {
      held.push(c)
      continue
    }
    if (await sendAlertEmail(supabase, c)) sent++
  }

  if (!forced) await notifyAdminAboutHeld(held)

  return { products: new Set(productIds).size, sent, held: held.length }
}

async function getProductIdsWithActiveAlerts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<string[]> {
  const { data } = await supabase
    .from('price_alerts')
    .select('product_id')
    .eq('is_active', true)
    .not('confirmed_at', 'is', null)
    .is('last_notified_at', null)

  return Array.from(new Set(((data ?? []) as { product_id: string }[]).map((r) => r.product_id)))
}

// Verificação diária de TODOS os alertas ativos (ver
// app/api/cron/price-alerts/route.ts). Os preços passam a ser gravados
// diretamente pela verificação diária das lojas, por isso já não basta
// verificar os alertas só quando se aprova um preço em /admin/precos.
export async function checkAllPriceAlerts(): Promise<AlertRunResult> {
  const supabase = getServiceClient()
  if (!supabase) return { products: 0, sent: 0, held: 0 }
  const productIds = await getProductIdsWithActiveAlerts(supabase)
  return checkAndSendPriceAlerts(productIds)
}

// Para a secção "Alertas retidos" de /admin/precos: lista os alertas que
// os travões estão a reter neste momento. Não envia nada.
export type HeldAlert = {
  alertId: string
  productId: string
  productName: string
  productSlug: string
  size: string | null
  kind: 'price' | 'restock'
  price: number
  targetPrice: number
  referencePrice: number | null
  reason: string
}

export async function getHeldAlerts(): Promise<HeldAlert[]> {
  const supabase = getServiceClient()
  if (!supabase) return []
  const productIds = await getProductIdsWithActiveAlerts(supabase)
  const candidates = await findAlertCandidates(supabase, productIds)
  return candidates
    .filter((c) => c.holdReason !== null)
    .map((c) => ({
      alertId: c.alertId,
      productId: c.productId,
      productName: c.productName,
      productSlug: c.productSlug,
      size: c.size,
      kind: c.kind,
      price: c.price,
      targetPrice: c.targetPrice,
      referencePrice: c.referencePrice,
      reason: holdReasonText(c.holdReason as HoldReason),
    }))
}
