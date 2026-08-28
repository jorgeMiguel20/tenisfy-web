// lib/getProductsWithPrice.ts
// Busca + cálculo de preço/poupança/descida partilhados entre a homepage
// (que só precisa de uma amostra para o "Comparar" e o "Maior poupança
// agora") e /catalogo (que precisa do conjunto todo para a grelha com
// filtros) - extraído de app/page.tsx para não duplicar esta lógica nos
// dois sítios.
import { supabase } from '@/lib/supabase'
import { computeSavingsFromRawOffers } from './savings'
import { computePriceDrop } from './priceDrop'
import type { ProductWithPrice } from './types'

export async function getProductsWithPrice(): Promise<{
  products: ProductWithPrice[]
  error: string | null
}> {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      brands (*),
      product_offers (id, price, in_stock, store_id, size, last_checked_at, affiliate_url, stores (name, shipping_base_fee, shipping_free_threshold, affiliate_url_template))
    `)
    .eq('is_active', true)

  if (error) {
    return { products: [], error: error.message }
  }

  // Histórico de preços das ofertas atualmente em stock, para detetar
  // descidas de preço recentes.
  const visibleOfferIds = (products ?? []).flatMap((p) =>
    p.product_offers.filter((o: any) => o.in_stock).map((o: any) => o.id)
  )

  const offerIdToProductId = new Map<string, string>()
  for (const p of products ?? []) {
    for (const o of p.product_offers as any[]) {
      if (o.in_stock) offerIdToProductId.set(o.id, p.id)
    }
  }

  const historyByProduct = new Map<string, { price: number; recorded_at: string }[]>()
  if (visibleOfferIds.length > 0) {
    const { data: historyRows } = await supabase
      .from('price_history')
      .select('product_offer_id, price, recorded_at')
      .in('product_offer_id', visibleOfferIds)

    for (const row of historyRows ?? []) {
      const productId = offerIdToProductId.get(row.product_offer_id)
      if (!productId) continue
      const list = historyByProduct.get(productId) ?? []
      list.push({ price: row.price, recorded_at: row.recorded_at })
      historyByProduct.set(productId, list)
    }
  }

  const productsWithPrice: ProductWithPrice[] = (products ?? []).map((p) => {
    const inStockOffers = p.product_offers.filter((o: any) => o.in_stock)
    const lowest_price = inStockOffers.length > 0
      ? Math.min(...inStockOffers.map((o: any) => o.price))
      : null
    const distinctStores = new Set(inStockOffers.map((o: any) => o.store_id))
    const sizes = Array.from(new Set(inStockOffers.map((o: any) => o.size))) as string[]
    const savings = computeSavingsFromRawOffers(p.product_offers as any[])
    const priceDrop = computePriceDrop(historyByProduct.get(p.id) ?? [])
    return { ...p, lowest_price, store_count: distinctStores.size, sizes, savings, priceDrop }
  })

  return { products: productsWithPrice, error: null }
}
