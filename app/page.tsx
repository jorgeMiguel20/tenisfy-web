// app/page.tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProductGrid from '@/components/ProductGrid'
import ProductCard from '@/components/ProductCard'
import HighlightProductCard, { type HighlightOffer } from '@/components/HighlightProductCard'
import { computeSavingsFromRawOffers } from '@/lib/savings'
import { computePriceDrop } from '@/lib/priceDrop'
import { getFreshnessLabel } from '@/lib/freshness'
import { buildOfferUrl } from '@/lib/offerUrl'
import type { ProductWithPrice } from '@/lib/types'

// Agrupa as ofertas em stock de um produto por loja (preço mais baixo por
// loja fica), mantendo os dados necessários para a tabela de destaque -
// mesma ideia de app/produto/[slug]/page.tsx e app/comparar/page.tsx, cada
// um com o subconjunto de campos que precisa.
function groupHighlightOffers(rawOffers: any[]): HighlightOffer[] {
  type Grouped = { store: string; price: number; last_checked_at: string; affiliate_url: string; affiliate_url_template: string | null }
  const grouped: Record<string, Grouped> = {}

  for (const offer of rawOffers) {
    if (!offer.in_stock) continue
    const storeName = offer.stores?.name ?? 'Loja'
    if (!grouped[storeName] || offer.price < grouped[storeName].price) {
      grouped[storeName] = {
        store: storeName,
        price: offer.price,
        last_checked_at: offer.last_checked_at,
        affiliate_url: offer.affiliate_url,
        affiliate_url_template: offer.stores?.affiliate_url_template ?? null,
      }
    }
  }

  return Object.values(grouped)
    .sort((a, b) => a.price - b.price)
    .map((g) => ({
      store: g.store,
      price: g.price,
      freshness: getFreshnessLabel(g.last_checked_at),
      url: buildOfferUrl(g),
    }))
}

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

  // Produto em destaque ("Maior poupança agora"): maior descida absoluta em
  // €, mesmos registos de price_history da secção acima - empate desempata
  // pela descida mais recente. Sem nenhuma descida, cai para o produto com
  // maior poupança entre lojas (mesma lógica do "Poupa X€"). Se não houver
  // nem uma coisa nem outra, a secção simplesmente não aparece.
  const highlightProduct: ProductWithPrice | null =
    recentDrops[0] ??
    [...productsWithPrice].filter((p) => p.savings).sort((a, b) => b.savings!.amount - a.savings!.amount)[0] ??
    null

  const highlightOffers = highlightProduct
    ? groupHighlightOffers((highlightProduct as any).product_offers as any[])
    : []

  const shortcuts = highlightProduct
    ? pickRandom(
        productsWithPrice.filter((p) => p.id !== highlightProduct.id),
        3
      ).map((p) => ({ slug: p.slug, label: p.model_name }))
    : []

  // Microcópia do cabeçalho do destaque: só fala em "baixou de preço" quando
  // isso é mesmo verdade (veio do caminho da descida) - no caminho de
  // reserva (maior poupança entre lojas, sem descida associada) usa uma
  // frase honesta para essa situação, para nunca inventar uma descida.
  const highlightEyebrow = highlightProduct?.priceDrop
    ? 'Baixou de preço esta semana'
    : 'A maior poupança entre lojas'
  const highlightSubtitle = highlightOffers.length > 0
    ? `${highlightOffers.length} ${highlightOffers.length === 1 ? 'loja' : 'lojas'}, o mesmo par, preços com portes já incluídos.`
    : ''

  // Fotos do hero: 3 produtos aleatórios do catálogo com foto, escolhidos de
  // novo sempre que a página é gerada/revalidada (ISR já em vigor - roda
  // sozinho ao ritmo da revalidação, sem precisar de infraestrutura nova).
  const heroPhotos = pickRandom(
    productsWithPrice.filter((p) => p.image_url),
    3
  )

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <section className="relative overflow-hidden pt-6 sm:pt-8 pb-8 sm:pb-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center"
        >
          <div className="h-72 w-[36rem] rounded-full bg-orange-100/50 blur-3xl" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-14">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Encontra o par certo.
              <br />
              Ao preço <span className="text-orange-600">certo</span>.
            </h1>
            <p className="mt-4 text-gray-900/60 text-lg max-w-xl mx-auto lg:mx-0">
              Compara preços, stock e tamanhos nas melhores lojas.
            </p>
          </div>

          {heroPhotos.length > 0 && (
            <div className="flex justify-center lg:justify-end gap-3 sm:gap-4 shrink-0">
              {heroPhotos.map((p) => (
                <Link
                  key={p.id}
                  href={`/produto/${p.slug}`}
                  className="block w-20 sm:w-28 lg:w-36 aspect-square rounded-2xl bg-gray-50 overflow-hidden shrink-0 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.06)] hover:opacity-90 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url!}
                    alt={`${p.brands?.name} ${p.model_name}`}
                    className="w-full h-full object-cover"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Suspense fallback={null}>
        <ProductGrid
          products={productsWithPrice as any}
          belowSearch={
            highlightProduct && highlightOffers.length > 0 ? (
              <section className="bg-gray-50 rounded-3xl p-4 sm:p-6 mb-10">
                <div className="flex items-end justify-between gap-4 mb-4 px-1">
                  <div>
                    <span className="text-sm font-semibold text-orange-700">
                      {highlightEyebrow}
                    </span>
                    <h2 className="text-xl font-bold text-gray-900 mt-0.5">Maior poupança agora</h2>
                    {highlightSubtitle && (
                      <p className="text-sm text-gray-500 mt-1">{highlightSubtitle}</p>
                    )}
                  </div>
                </div>
                <HighlightProductCard
                  product={{
                    slug: highlightProduct.slug,
                    brand: highlightProduct.brands?.name ?? '',
                    name: highlightProduct.model_name,
                    image: highlightProduct.image_url,
                  }}
                  savings={highlightProduct.savings ?? null}
                  priceDrop={highlightProduct.priceDrop ?? null}
                  offers={highlightOffers}
                  shortcuts={shortcuts}
                />
              </section>
            ) : undefined
          }
        />
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
