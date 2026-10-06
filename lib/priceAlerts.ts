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

// Para cada produto, vê se algum alerta confirmado e ainda não usado já
// pode disparar, e envia o e-mail. Cada alerta só notifica uma vez - depois
// disso fica inativo (o utilizador pode sempre criar um novo).
//
// Chamado depois de aprovar preços em /admin/precos e, todos os dias, pela
// verificação automática de alertas (app/api/cron/price-alerts/route.ts).
// Uma falha aqui nunca impede o resto: um alerta que falhe a enviar fica
// por notificar e volta a ser tentado na próxima verificação.
export async function checkAndSendPriceAlerts(productIds: string[]): Promise<number> {
  const uniqueProductIds = Array.from(new Set(productIds)).filter(Boolean)
  if (uniqueProductIds.length === 0) return 0

  const supabase = getServiceClient()
  if (!supabase || !resend) return 0 // sem configuração (Supabase ou Resend), não tenta enviar

  let sent = 0
  const nowIso = new Date().toISOString()

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

      for (const alert of alerts as unknown as AlertRow[]) {
        const result = evaluateAlert(alert, offers)
        if (!result) continue

        const product = alert.products
        const modelName = product?.model_name ?? 'ténis'
        const sizeText = alert.size ? ` no tamanho ${alert.size}` : ''
        const subject =
          result.kind === 'restock'
            ? `O ${modelName}${sizeText} voltou a ter stock (${formatPrice(result.price)})`
            : `O preço do ${modelName}${sizeText} desceu para ${formatPrice(result.price)}`

        try {
          await resend.emails.send({
            from: ALERTS_FROM_EMAIL,
            to: alert.email,
            subject,
            html: priceAlertEmailHtml({
              kind: result.kind,
              brandName: product?.brands?.name ?? '',
              modelName: product?.model_name ?? '',
              imageUrl: product?.image_url ?? null,
              size: alert.size,
              price: result.price,
              targetPrice: alert.target_price,
              productUrl: `${SITE_URL}/produto/${product?.slug}`,
              unsubscribeUrl: `${SITE_URL}/alertas/cancelar?token=${alert.unsubscribe_token}`,
            }),
          })

          await supabase
            .from('price_alerts')
            .update({ last_notified_at: new Date().toISOString(), is_active: false })
            .eq('id', alert.id)

          sent++
        } catch (err) {
          console.error(`Falha ao enviar alerta de preço (alerta ${alert.id}, produto ${productId}):`, err)
        }
      }
    } catch (err) {
      console.error(`Falha ao verificar alertas de preço do produto ${productId}:`, err)
    }
  }

  return sent
}

// Verificação diária de TODOS os alertas ativos (ver
// app/api/cron/price-alerts/route.ts). Os preços passam a ser gravados
// diretamente pela verificação diária das lojas, por isso já não basta
// verificar os alertas só quando se aprova um preço em /admin/precos.
export async function checkAllPriceAlerts(): Promise<{ products: number; sent: number }> {
  const supabase = getServiceClient()
  if (!supabase) return { products: 0, sent: 0 }

  const { data } = await supabase
    .from('price_alerts')
    .select('product_id')
    .eq('is_active', true)
    .not('confirmed_at', 'is', null)
    .is('last_notified_at', null)

  const productIds = Array.from(new Set(((data ?? []) as { product_id: string }[]).map((r) => r.product_id)))
  const sent = await checkAndSendPriceAlerts(productIds)
  return { products: productIds.length, sent }
}
