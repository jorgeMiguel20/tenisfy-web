// app/produto/[slug]/page.tsx

import { supabase } from '@/lib/supabase'

import { notFound } from 'next/navigation'

import Link from 'next/link'

import type { Metadata } from 'next'

import FavoriteButton from '@/components/FavoriteButton'

import ProductCard from '@/components/ProductCard'

import ProductGallery from '@/components/ProductGallery'

import PriceHistoryChart, { type PricePoint } from '@/components/PriceHistoryChart'

import { formatPrice } from '@/lib/formatPrice'

import { computeSavings, computeSavingsFromRawOffers } from '@/lib/savings'

import { buildOfferUrl } from '@/lib/offerUrl'

import type { ProductWithPrice } from '@/lib/types'



export const revalidate = 3600 // ISR: 1 hora, conforme a regra de cache do projeto



export async function generateStaticParams() {

  const { data: products } = await supabase.from('products').select('slug')

  return (products ?? []).map((p) => ({ slug: p.slug }))

}



export async function generateMetadata({

  params,

}: {

  params: Promise<{ slug: string }>

}): Promise<Metadata> {

  const { slug } = await params



  const { data: product } = await supabase

    .from('products')

    .select('*, brands (*), product_offers (price, in_stock, store_id)')

    .eq('slug', slug)

    .single()



  if (!product) {

    return { title: 'Produto não encontrado | Parjusto' }

  }



  const inStockOffers = (product.product_offers as any[]).filter((o) => o.in_stock)

  const distinctStores = new Set(inStockOffers.map((o: any) => o.store_id))

  const storeCount = distinctStores.size

  const lowestPrice = inStockOffers.length > 0

    ? Math.min(...inStockOffers.map((o: any) => o.price))

    : null



  const title = `${product.brands?.name} ${product.model_name}${lowestPrice ? ` desde ${formatPrice(lowestPrice)}` : ''} | Parjusto`

  const description = `Compara o preço do ${product.brands?.name} ${product.model_name} em ${storeCount} loja${storeCount !== 1 ? 's' : ''} portuguesa${storeCount !== 1 ? 's' : ''}. ${lowestPrice ? `Desde ${formatPrice(lowestPrice)}.` : ''} Encontra a melhor oferta no Parjusto.`



  return {

    title,

    description,

    openGraph: {

      title,

      description,

      images: product.image_url ? [product.image_url] : [],

    },

  }

}



type GroupedOffer = {

  store: string

  sizes: string[]

  price: number

  affiliate_url: string

  affiliate_url_template: string | null

  shipping_info: string | null

  shipping_base_fee: number | null

  shipping_free_threshold: number | null

}

type ShippingDisplay = { type: 'badge' | 'text'; text: string }

function getShippingDisplay(offer: GroupedOffer): ShippingDisplay | null {
  const { shipping_free_threshold: threshold, shipping_base_fee: fee, shipping_info, store } = offer

  if (threshold == null) {
    return shipping_info ? { type: 'text', text: shipping_info } : null
  }

  if (offer.price >= threshold) {
    return { type: 'badge', text: 'Portes Grátis' }
  }

  // Nike: abaixo do limiar o envio depende do estatuto de membro, que não temos — mantém o texto estático em vez de calcular
  if (store === 'Nike Oficial') {
    return shipping_info ? { type: 'text', text: shipping_info } : null
  }

  if (fee != null) {
    return { type: 'text', text: `+${formatPrice(fee)} envio (grátis acima de ${formatPrice(threshold)})` }
  }

  return { type: 'text', text: `Grátis acima de ${formatPrice(threshold)}` }
}

function ShippingLine({ offer, className }: { offer: GroupedOffer; className?: string }) {
  const shipping = getShippingDisplay(offer)
  if (!shipping) return null

  if (shipping.type === 'badge') {
    return (
      <span className={`inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${className ?? ''}`}>
        {shipping.text}
      </span>
    )
  }

  return <span className={`text-xs text-gray-400 ${className ?? ''}`}>{shipping.text}</span>
}

// Cor aproximada para cada valor de base_colors (mesma lista usada no filtro
// de cor do catálogo, ver COLOR_ORDER em components/ProductGrid.tsx).
const COLOR_SWATCH_HEX: Record<string, string> = {
  Preto: '#111827',
  Branco: '#f9fafb',
  Cinzento: '#9ca3af',
  Azul: '#2563eb',
  Vermelho: '#dc2626',
  Verde: '#16a34a',
  Bege: '#d6c7a1',
  Multicolor: '#f97316',
}

function ColorSwatch({
  baseColors,
  label,
  selected = false,
}: {
  baseColors: string[] | null
  label: string
  selected?: boolean
}) {
  const colors = (baseColors ?? []).map((c) => COLOR_SWATCH_HEX[c] ?? '#d1d5db')

  const style =
    colors.length >= 2
      ? { background: `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)` }
      : { background: colors[0] ?? '#d1d5db' }

  return (
    <span
      aria-hidden="true"
      title={label}
      style={style}
      className={`block h-8 w-8 rounded-full ${
        selected ? 'ring-2 ring-offset-2 ring-gray-900' : 'border border-gray-200'
      }`}
    />
  )
}

function withinPriceRange(price: number | null, anchor: number, ratio = 0.3) {
  if (price == null) return false
  return price >= anchor * (1 - ratio) && price <= anchor * (1 + ratio)
}

// Cascata: primeiro mesma marca + preço parecido (±30%); se der menos de 3,
// alarga a mesma categoria + preço parecido. Nunca inclui o próprio produto
// nem duplica (a segunda fase ignora os já escolhidos na primeira).
function pickSimilarProducts(
  candidates: ProductWithPrice[],
  current: { id: string; brand_id: string; category: string | null },
  anchorPrice: number | null,
  max = 5
): ProductWithPrice[] {
  if (anchorPrice == null) return []

  const pool = candidates.filter((p) => p.id !== current.id && p.lowest_price != null)

  const sameBrand = pool.filter(
    (p) => p.brand_id === current.brand_id && withinPriceRange(p.lowest_price, anchorPrice)
  )

  const result = [...sameBrand]

  if (result.length < 3 && current.category) {
    const usedIds = new Set(result.map((p) => p.id))
    const sameCategory = pool.filter(
      (p) =>
        !usedIds.has(p.id) &&
        p.category === current.category &&
        withinPriceRange(p.lowest_price, anchorPrice)
    )
    result.push(...sameCategory)
  }

  return result.slice(0, max)
}



export default async function ProdutoPage({

  params,

}: {

  params: Promise<{ slug: string }>

}) {

  const { slug } = await params



  const { data: product, error } = await supabase

    .from('products')

    .select(`

      *,

      brands (*),

      product_offers (

        id, size, price, currency, affiliate_url, in_stock, last_checked_at,

        stores (name, shipping_info, shipping_base_fee, shipping_free_threshold, affiliate_url_template)

      )

    `)

    .eq('slug', slug)

    .single()



  if (error || !product) {

    notFound()

  }



  const { data: candidateProducts } = await supabase
    .from('products')
    .select(`
      *,
      brands (*),
      product_offers (price, in_stock, store_id, size, stores (name, shipping_base_fee, shipping_free_threshold))
    `)
    .eq('is_active', true)
    .neq('id', product.id)

  const similarCandidates: ProductWithPrice[] = (candidateProducts ?? []).map((p: any) => {
    const inStockOffers = (p.product_offers as any[]).filter((o) => o.in_stock)
    const lowest_price = inStockOffers.length > 0
      ? Math.min(...inStockOffers.map((o: any) => o.price))
      : null
    const distinctStores = new Set(inStockOffers.map((o: any) => o.store_id))
    const sizes = Array.from(new Set(inStockOffers.map((o: any) => o.size))) as string[]
    const savings = computeSavingsFromRawOffers(p.product_offers as any[])
    return { ...p, lowest_price, store_count: distinctStores.size, sizes, savings }
  })



  const rawOffers = (product.product_offers as any[]).filter((o) => o.in_stock)

  const visibleOfferIds = rawOffers.map((o: any) => o.id)

  // Histórico de preços: só das ofertas atualmente visíveis (mesma lógica do
  // "melhor preço" usada no resto do site), até 60 dias - o máximo que o
  // seletor do gráfico permite ver.
  let priceHistory: PricePoint[] = []
  if (visibleOfferIds.length > 0) {
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const { data: historyRows } = await supabase
      .from('price_history')
      .select('product_offer_id, price, recorded_at')
      .in('product_offer_id', visibleOfferIds)
      .gte('recorded_at', sixtyDaysAgo.toISOString())
      .order('recorded_at', { ascending: true })

    const bestPriceByDate = new Map<string, number>()
    for (const row of historyRows ?? []) {
      const date = (row.recorded_at as string).slice(0, 10)
      const current = bestPriceByDate.get(date)
      if (current == null || row.price < current) bestPriceByDate.set(date, row.price)
    }

    priceHistory = Array.from(bestPriceByDate.entries())
      .map(([date, price]) => ({ date, price }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }



  const grouped: Record<string, GroupedOffer> = {}

  for (const offer of rawOffers) {

    const storeName = offer.stores?.name ?? 'Loja'

    if (!grouped[storeName]) {

      grouped[storeName] = {

        store: storeName,

        sizes: [],

        price: offer.price,

        affiliate_url: offer.affiliate_url,

        affiliate_url_template: offer.stores?.affiliate_url_template ?? null,

        shipping_info: offer.stores?.shipping_info ?? null,

        shipping_base_fee: offer.stores?.shipping_base_fee ?? null,

        shipping_free_threshold: offer.stores?.shipping_free_threshold ?? null,

      }

    }

    grouped[storeName].sizes.push(offer.size)

    if (offer.price < grouped[storeName].price) {

      grouped[storeName].price = offer.price

      grouped[storeName].affiliate_url = offer.affiliate_url

    }

  }



  const groupedOffers = Object.values(grouped)

    .map((g) => ({

      ...g,

      sizes: g.sizes.sort((a, b) => parseFloat(a) - parseFloat(b)),

    }))

    .sort((a, b) => a.price - b.price)



  const savingsResult = computeSavings(groupedOffers)



  // A mais antiga entre as ofertas visíveis (pior caso) - mais honesto do que
  // "hoje", que não refletia quando os preços foram mesmo verificados.
  const oldestCheckedAt = rawOffers.length > 0
    ? rawOffers.reduce((oldest: string, o: any) => (o.last_checked_at < oldest ? o.last_checked_at : oldest), rawOffers[0].last_checked_at)
    : null

  const updatedLabel = oldestCheckedAt
    ? new Date(oldestCheckedAt).toLocaleDateString('pt-PT', {
        month: 'long',
        year: 'numeric',
      })
    : null

  const specs = [
    { label: 'Material', value: product.material },
    { label: 'Sola', value: product.sole_type },
    { label: 'Fecho', value: product.closure_type },
    { label: 'Ajuste', value: product.fit },
    { label: 'Cor', value: product.color },
    { label: 'Código do artigo', value: product.article_code },
    { label: 'Peso', value: product.weight },
    { label: 'Declive', value: product.drop_height },
    { label: 'Sustentabilidade', value: product.sustainability },
  ].filter((spec) => spec.value)

  const similarProducts = pickSimilarProducts(
    similarCandidates,
    { id: product.id, brand_id: product.brand_id, category: product.category },
    groupedOffers[0]?.price ?? null
  )
  const showSimilar = similarProducts.length >= 3

  // Produtos-irmãos: mesmo color_variant_group, excluindo o próprio produto.
  // Sem grupo ou sem irmãos = sem secção (nunca mostra um swatch sozinho).
  const colorSiblings = product.color_variant_group
    ? similarCandidates.filter((p) => p.color_variant_group === product.color_variant_group)
    : []
  const showColorSwatches = colorSiblings.length > 0



  return (

    <main className="max-w-5xl mx-auto px-6 py-10 relative overflow-hidden">

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center">

        <div className="h-72 w-[36rem] rounded-full bg-orange-100/40 blur-3xl" />

      </div>



      <nav className="text-sm text-gray-500 mb-2">

        <Link href="/" className="hover:underline">Parjusto</Link>

        <span className="mx-1.5">/</span>

        <span>{product.brands?.name}</span>

        <span className="mx-1.5">/</span>

        <span className="text-gray-400">{product.model_name}</span>

      </nav>



      <Link href="/" className="text-gray-500 text-sm hover:underline">&larr; Voltar</Link>



      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">

        <ProductGallery
          images={product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []}
          alt={`${product.brands?.name} ${product.model_name}`}
          layout="thumbnails"
        />



        <div>

          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{product.brands?.name}</p>

          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{product.model_name}</h1>

            <FavoriteButton slug={product.slug} className="shrink-0" />
          </div>

          {showColorSwatches && (
            <div className="flex items-center gap-2 mt-4">
              <ColorSwatch
                baseColors={product.base_colors}
                label={product.color ?? product.model_name}
                selected
              />
              {colorSiblings.map((sibling) => (
                <Link key={sibling.id} href={`/produto/${sibling.slug}`} className="block">
                  <ColorSwatch baseColors={sibling.base_colors} label={sibling.color ?? sibling.model_name} />
                </Link>
              ))}
            </div>
          )}

          {groupedOffers.length === 0 ? (

            <p className="text-gray-400 mt-6">Sem ofertas disponíveis de momento.</p>

          ) : (

            <>

              {savingsResult && (

                <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 text-sm font-medium px-3 py-1.5 rounded-full mt-4">Poupa {formatPrice(savingsResult.amount)} escolhendo {savingsResult.store}</div>

              )}



              {updatedLabel && (
                <p className="text-sm text-gray-500 mt-4 mb-2 font-medium">Preços atualizados em {updatedLabel}</p>
              )}



              {/* Desktop/tablet: tabela (a partir de md) */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden hidden md:block">

                <table className="w-full border-collapse">

                  <thead>

                    <tr className="border-b border-gray-100 text-left bg-gray-50">

                      <th className="p-4 text-sm font-medium text-gray-500">Loja</th>

                      <th className="p-4 text-sm font-medium text-gray-500">Tamanhos</th>

                      <th className="p-4 text-sm font-medium text-gray-500">Preço</th>

                      <th className="p-4"></th>

                    </tr>

                  </thead>

                  <tbody>

                    {groupedOffers.map((offer, index) => (

                      <tr key={offer.store} className="border-b border-gray-50 last:border-0">

                        <td className="p-4">

                          <div className="flex items-center gap-2">

                            <span>{offer.store}</span>

                            {index === 0 && groupedOffers.length > 1 && (

                              <span className="inline-flex items-center bg-green-50 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">

                                Melhor preço

                              </span>

                            )}

                          </div>

                        </td>

                        <td className="p-4 text-gray-600">{offer.sizes.join(', ')}</td>

                        <td className="p-4 align-middle">
                          <div className="flex flex-col justify-center min-h-[52px]">
                            <span className="text-lg font-bold text-orange-600">{formatPrice(offer.price)}</span>
                            <ShippingLine offer={offer} className="mt-1" />
                          </div>
                        </td>

                        <td className="p-4"><a href={buildOfferUrl(offer)} target="_blank" rel="nofollow sponsored noopener" className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium inline-block hover:bg-gray-700 transition-colors">Ver oferta</a></td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              {/* Mobile: cards verticais empilhados, sem scroll horizontal (abaixo de md) */}
              <div className="flex flex-col gap-3 md:hidden">
                {groupedOffers.map((offer, index) => (
                  <div
                    key={offer.store}
                    className="rounded-2xl border border-gray-100 p-4 flex flex-col items-center text-center gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{offer.store}</span>
                      {index === 0 && groupedOffers.length > 1 && (
                        <span className="inline-flex items-center bg-green-50 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          Melhor preço
                        </span>
                      )}
                    </div>

                    {offer.sizes.length > 0 && (
                      <p className="text-sm text-gray-500">Tamanhos: {offer.sizes.join(', ')}</p>
                    )}

                    <div className="flex flex-col items-center gap-1">
                      <p className="text-2xl font-bold text-orange-600">{formatPrice(offer.price)}</p>
                      <ShippingLine offer={offer} />
                    </div>

                    <a
                      href={buildOfferUrl(offer)}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      className="w-full bg-gray-900 text-white px-4 py-2.5 rounded-full text-sm font-medium text-center hover:bg-gray-700 transition-colors"
                    >
                      Ver oferta
                    </a>
                  </div>
                ))}
              </div>

              {groupedOffers.some((offer) => getShippingDisplay(offer)) && (
                <p className="text-xs text-gray-400 mt-3">
                  As taxas de envio são estimadas (Portugal continental). Confirma sempre na loja antes de finalizar a compra.
                </p>
              )}

            </>

          )}

        </div>

      </div>

      {visibleOfferIds.length > 0 && (
        <div className="mt-10">
          <PriceHistoryChart data={priceHistory} />
        </div>
      )}

      {specs.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Detalhes do produto</h2>
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full border-collapse">
              <tbody>
                {specs.map((spec, index) => (
                  <tr key={spec.label} className={index !== specs.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="p-4 text-sm font-medium text-gray-500 bg-gray-50 w-1/3">{spec.label}</td>
                    <td className="p-4 text-gray-900">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showSimilar && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Modelos semelhantes</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0">
            {similarProducts.map((p) => (
              <div key={p.id} className="w-44 shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}

    </main>

  )

}