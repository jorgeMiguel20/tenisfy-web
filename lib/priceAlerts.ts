// lib/priceAlerts.ts
import { createClient } from '@supabase/supabase-js'
import { resend, ALERTS_FROM_EMAIL } from './resend'
import { SITE_URL } from './siteUrl'
import { formatPrice } from './formatPrice'
import { priceAlertEmailHtml } from './emailTemplates/priceAlertEmail'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

// Preço mais baixo atual (só ofertas em stock) para um produto - o mesmo
// critério usado em todo o resto do site (ver lib/getProductsWithPrice.ts).
async function getLowestPrice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  productId: string
): Promise<number | null> {
  const { data } = await supabase
    .from('product_offers')
    .select('price')
    .eq('product_id', productId)
    .eq('in_stock', true)

  if (!data || data.length === 0) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Math.min(...data.map((o: any) => o.price))
}

// Chamado depois de um preço ser aprovado em
// app/admin/precos/proposalActions.ts. Para cada produto afetado, vê se o
// preço atual (mais baixo, só em stock) já chegou ao valor de algum alerta
// confirmado e ainda não notificado, e envia o e-mail. Cada alerta só
// notifica uma vez - depois disso fica inativo (o utilizador pode sempre
// criar um novo a partir da página do produto).
//
// Nunca deixa uma falha aqui impedir a aprovação do preço em si - já foi
// guardada antes desta função ser chamada; um alerta que falhe a enviar
// fica por notificar e tenta-se de novo na próxima vez que o preço deste
// produto for aprovado.
export async function checkAndSendPriceAlerts(productIds: string[]): Promise<void> {
  const uniqueProductIds = Array.from(new Set(productIds)).filter(Boolean)
  if (uniqueProductIds.length === 0) return

  const supabase = getServiceClient()
  if (!supabase || !resend) return // sem configuração (Supabase ou Resend), não tenta enviar

  for (const productId of uniqueProductIds) {
    try {
      const lowestPrice = await getLowestPrice(supabase, productId)
      if (lowestPrice == null) continue

      const { data: alerts } = await supabase
        .from('price_alerts')
        .select('id, email, target_price, unsubscribe_token, products(model_name, slug, image_url, brands(name))')
        .eq('product_id', productId)
        .eq('is_active', true)
        .not('confirmed_at', 'is', null)
        .is('last_notified_at', null)
        .gte('target_price', lowestPrice)

      if (!alerts || alerts.length === 0) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const alert of alerts as any[]) {
        const product = alert.products

        try {
          await resend.emails.send({
            from: ALERTS_FROM_EMAIL,
            to: alert.email,
            subject: `O preço do ${product?.model_name ?? 'ténis'} desceu para ${formatPrice(lowestPrice)}`,
            html: priceAlertEmailHtml({
              brandName: product?.brands?.name ?? '',
              modelName: product?.model_name ?? '',
              imageUrl: product?.image_url ?? null,
              price: lowestPrice,
              targetPrice: alert.target_price,
              productUrl: `${SITE_URL}/produto/${product?.slug}`,
              unsubscribeUrl: `${SITE_URL}/alertas/cancelar?token=${alert.unsubscribe_token}`,
            }),
          })

          await supabase
            .from('price_alerts')
            .update({ last_notified_at: new Date().toISOString(), is_active: false })
            .eq('id', alert.id)
        } catch (err) {
          console.error(`Falha ao enviar alerta de preço (${alert.email}, produto ${productId}):`, err)
        }
      }
    } catch (err) {
      console.error(`Falha ao verificar alertas de preço do produto ${productId}:`, err)
    }
  }
}
