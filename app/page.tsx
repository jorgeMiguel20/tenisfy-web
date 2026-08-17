// app/page.tsx
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import ProductGrid from '@/components/ProductGrid'
import ProductCard from '@/components/ProductCard'
import { computeSavingsFromRawOffers } from '@/lib/savings'
import { computePriceDrop } from '@/lib/priceDrop'
import type { ProductWithPrice } from '@/lib/types'

export default async function Home() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      brands (*),
      product_offers (id, price, in_stock, store_id, size, stores (name, shipping_base_fee, shipping_free_threshold))
    `)
    .eq('is_active', true)

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-red-600">Erro ao carregar produtos: {error.message}</p>
      </main>
    )
  }

  // Histórico de preços das ofertas atualmente em stock, para detetar
  // descidas de preço recentes (secção "Descidas de preço recentes" abaixo).
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

  // Só produtos com descida real (>=2 pontos de histórico e >=1€ de
  // diferença - ver lib/priceDrop.ts), dos mais recentes para os menos.
  const recentDrops = productsWithPrice
    .filter((p) => p.priceDrop)
    .sort((a, b) => b.priceDrop!.amount - a.priceDrop!.amount)

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <section className="relative overflow-hidden text-center pt-6 sm:pt-8 pb-8 sm:pb-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center"
        >
          <div className="h-72 w-[36rem] rounded-full bg-orange-100/50 blur-3xl" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
          Encontra o par certo.
          <br />
          Ao preço <span className="text-orange-600">certo</span>.
        </h1>
        <p className="mt-4 text-gray-900/60 text-lg max-w-xl mx-auto">
          Compara preços, stock e tamanhos nas melhores lojas.
        </p>
      </section>

      <Suspense fallback={null}>
        <ProductGrid products={productsWithPrice as any} />
      </Suspense>

      {recentDrops.length > 0 && (
        <section className="mt-12 pt-10 border-t border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Descidas de preço recentes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
            {recentDrops.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}