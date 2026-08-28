// app/page.tsx
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import ProductGrid from '@/components/ProductGrid'
import CategoryTiles from '@/components/CategoryTiles'
import HomeHero from '@/components/HomeHero'
import HomeBanner from '@/components/HomeBanner'
import CompararPreview from '@/components/CompararPreview'
import PesquisaPorFoto from '@/components/PesquisaPorFoto'
import ComoFunciona from '@/components/ComoFunciona'
import MaiorPoupancaAgora from '@/components/MaiorPoupancaAgora'
import ProductCard from '@/components/ProductCard'
import { computeSavingsFromRawOffers } from '@/lib/savings'
import { computePriceDrop } from '@/lib/priceDrop'
import type { ProductWithPrice } from '@/lib/types'

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export default async function Home() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      brands (*),
      product_offers (id, price, in_stock, store_id, size, last_checked_at, affiliate_url, stores (name, shipping_base_fee, shipping_free_threshold, affiliate_url_template))
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
  // descidas de preço recentes (secção "Descidas de preço recentes" e
  // seleção do produto em destaque, ambos abaixo).
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

  // As 3 maiores descidas viram o destaque "Maior poupança agora"; as
  // restantes continuam disponíveis em "Descidas de preço recentes" no
  // catálogo, sem repetir os mesmos 3 produtos nas duas secções.
  const topDeals = recentDrops.slice(0, 3)
  const remainingDrops = recentDrops.slice(3)

  // 2 produtos reais para a prévia do "Comparar" (nunca dados de exemplo
  // inventados) - com foto e preço.
  const compareProducts = pickRandom(
    productsWithPrice.filter((p) => p.image_url && p.lowest_price != null),
    2
  )

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <HomeHero />
      <HomeBanner />

      <CategoryTiles />

      <div className="pt-2">
        <CompararPreview products={compareProducts} />
        <PesquisaPorFoto />
        <ComoFunciona />
        <MaiorPoupancaAgora products={topDeals} />
      </div>

      <div id="catalogo" className="pt-10 border-t border-gray-100">
        <Suspense fallback={null}>
          <ProductGrid products={productsWithPrice as any} />
        </Suspense>

        {remainingDrops.length > 0 && (
          <section className="mt-12 pt-10 border-t border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Descidas de preço recentes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
              {remainingDrops.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
