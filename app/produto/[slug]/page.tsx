// app/produto/[slug]/page.tsx

import { supabase } from '@/lib/supabase'
import { productSelect } from '@/lib/productColumns'

import { notFound } from 'next/navigation'

import { SITE_URL } from '@/lib/siteUrl'

import { buildOfferUrl } from '@/lib/offerUrl'

import Link from 'next/link'

import type { Metadata } from 'next'

import FavoriteButton from '@/components/FavoriteButton'

import ProductCard from '@/components/ProductCard'

import ProductGallery from '@/components/ProductGallery'

import PriceHistoryChart, { type PricePoint } from '@/components/PriceHistoryChart'

import { formatPrice } from '@/lib/formatPrice'

import { computeSavings, computeSavingsFromRawOffers } from '@/lib/savings'

import StoreOffersList, { type StoreOfferForDisplay } from '@/components/StoreOffersList'
import PriceAlertButton from '@/components/PriceAlertButton'

import type { ProductWithPrice } from '@/lib/types'
import { compareSizes } from '@/lib/sizeSort'
import { getGuidesForProduct } from '@/lib/guides'



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

    .select(productSelect(`brands (*), product_offers (price, in_stock, store_id, discontinued_at)`))

    .eq('slug', slug)

    .single()



  if (!product) {

    return { title: 'Produto não encontrado | Parjusto' }

  }



  const inStockOffers = (product.product_offers as any[]).filter((o) => o.in_stock && !o.discontinued_at)

  const distinctStores = new Set(inStockOffers.map((o: any) => o.store_id))

  const storeCount = distinctStores.size

  const lowestPrice = inStockOffers.length > 0

    ? Math.min(...inStockOffers.map((o: any) => o.price))

    : null



  const title = `${product.brands?.name} ${product.model_name}${lowestPrice ? ` desde ${formatPrice(lowestPrice)}` : ''} | Parjusto`

  // Sem lojas com stock, "em 0 lojas" soava mal no Google - nesse caso a
  // descrição diz que o ténis está sem stock neste momento.
  const description = storeCount > 0
    ? `Compara o preço do ${product.brands?.name} ${product.model_name} em ${storeCount} loja${storeCount !== 1 ? 's' : ''} portuguesa${storeCount !== 1 ? 's' : ''}. ${lowestPrice ? `Desde ${formatPrice(lowestPrice)}.` : ''} Encontra a melhor oferta no Parjusto.`
    : `${product.brands?.name} ${product.model_name}: neste momento sem stock nas lojas portuguesas que acompanhamos. Vê outros ténis parecidos e compara preços no Parjusto.`



  return {

    title,

    description,

    // Endereço oficial desta página para o Google (sem parâmetros).
    alternates: { canonical: `/produto/${slug}` },

    openGraph: {

      title,

      description,

      images: product.image_url ? [product.image_url] : [],

    },

  }

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
    <span className="relative inline-block">
      <span
        aria-hidden="true"
        title={label}
        style={style}
        className={`block h-8 w-8 rounded-full ${
          selected ? 'ring-2 ring-offset-2 ring-gray-900' : 'border border-gray-200'
        }`}
      />
      <span className="sr-only">{label}</span>
    </span>
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

    .select(productSelect(`

      brands (*),

      product_offers (

        id, size, price, currency, affiliate_url, in_stock, last_checked_at, discontinued_at,

        stores (name, base_url, shipping_info, shipping_base_fee, shipping_free_threshold, affiliate_url_template)

      )

    `))

    .eq('slug', slug)

    .single()



  if (error || !product) {

    notFound()

  }



  const relatedFilters = [`brand_id.eq.${product.brand_id}`]
  if (product.category) relatedFilters.push(`category.eq.${product.category}`)
  if (product.color_variant_group) relatedFilters.push(`color_variant_group.eq.${product.color_variant_group}`)

  const { data: candidateProducts } = await supabase
    .from('products')
    .select(productSelect(`
      brands (*),
      product_offers (price, in_stock, store_id, size, discontinued_at, stores (name, shipping_base_fee, shipping_free_threshold))
    `))
    .eq('is_active', true)
    .neq('id', product.id)
    // So produtos que possam qualificar para "Modelos semelhantes" (mesma
    // marca ou categoria) ou aparecer como variante de cor - evita trazer
    // o catalogo inteiro nesta query, que corre em todas as paginas de
    // produto.
    .or(relatedFilters.join(','))
    .limit(60)

  const similarCandidates: ProductWithPrice[] = (candidateProducts ?? []).map((p: any) => {
    const inStockOffers = (p.product_offers as any[]).filter((o) => o.in_stock && !o.discontinued_at)
    const lowest_price = inStockOffers.length > 0
      ? Math.min(...inStockOffers.map((o: any) => o.price))
      : null
    const distinctStores = new Set(inStockOffers.map((o: any) => o.store_id))
    const sizes = Array.from(new Set(inStockOffers.map((o: any) => o.size))) as string[]
    const savings = computeSavingsFromRawOffers(p.product_offers as any[], p.brands?.name)
    return { ...p, lowest_price, store_count: distinctStores.size, sizes, savings }
  })



  // Ofertas descontinuadas (loja deixou de vender - ver "Descontinuar
  // oferta" em /admin/precos) tratam-se como se não existissem: nem sequer
  // aparecem riscadas como esgotadas, ao contrário de uma oferta só
  // temporariamente sem stock.
  const allOffers = (product.product_offers as any[]).filter((o) => !o.discontinued_at)

  const rawOffers = allOffers.filter((o) => o.in_stock)

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



  // Agrupa por loja a partir de TODAS as ofertas (em stock ou não), para
  // podermos mostrar tamanhos esgotados riscados no card da loja (pedido do
  // Jorge). Preço, link de afiliado e "verificado há" continuam a basear-se
  // SÓ nas ofertas em stock - nunca deixar uma oferta esgotada influenciar o
  // preço mostrado, o "Melhor preço" ou o "Portes Grátis".
  type StoreGroupAccumulator = {
    store: string
    domain: string
    sizes: Map<string, boolean> // tamanho -> em stock nesta loja
    price: number | null
    affiliate_url: string | null
    affiliate_url_template: string | null
    shipping_info: string | null
    shipping_base_fee: number | null
    shipping_free_threshold: number | null
    oldestCheckedAt: string | null
  }

  const grouped: Record<string, StoreGroupAccumulator> = {}

  for (const offer of allOffers) {
    const storeName = offer.stores?.name ?? 'Loja'

    if (!grouped[storeName]) {
      let domain = ''
      try {
        domain = new URL(offer.stores?.base_url ?? '').hostname.replace(/^www\./, '')
      } catch {
        domain = ''
      }
      grouped[storeName] = {
        store: storeName,
        domain,
        sizes: new Map(),
        price: null,
        affiliate_url: null,
        affiliate_url_template: offer.stores?.affiliate_url_template ?? null,
        shipping_info: offer.stores?.shipping_info ?? null,
        shipping_base_fee: offer.stores?.shipping_base_fee ?? null,
        shipping_free_threshold: offer.stores?.shipping_free_threshold ?? null,
        oldestCheckedAt: null,
      }
    }

    const group = grouped[storeName]

    // Nunca "despromove" um tamanho já visto em stock para esgotado (evita
    // contradições se os dados tiverem linhas duplicadas para o mesmo
    // tamanho).
    if (!group.sizes.get(offer.size)) {
      group.sizes.set(offer.size, offer.in_stock)
    }

    if (offer.in_stock) {
      if (group.price == null || offer.price < group.price) {
        group.price = offer.price
        group.affiliate_url = offer.affiliate_url
      }
      if (group.oldestCheckedAt == null || offer.last_checked_at < group.oldestCheckedAt) {
        group.oldestCheckedAt = offer.last_checked_at
      }
    }
  }

  const groupedOffers: StoreOfferForDisplay[] = Object.values(grouped)
    // Só lojas com pelo menos uma oferta em stock - uma loja sem nenhum
    // tamanho disponível não deve aparecer na lista (fica para a ronda à
    // parte de "Descontinuar ofertas").
    .filter((g): g is StoreGroupAccumulator & { price: number; affiliate_url: string } => g.price != null && g.affiliate_url != null)
    .map((g) => ({
      store: g.store,
      domain: g.domain,
      price: g.price,
      affiliate_url: g.affiliate_url,
      affiliate_url_template: g.affiliate_url_template,
      shipping_info: g.shipping_info,
      shipping_base_fee: g.shipping_base_fee,
      shipping_free_threshold: g.shipping_free_threshold,
      lastCheckedAt: g.oldestCheckedAt,
      sizes: Array.from(g.sizes.entries())
        .map(([size, inStock]) => ({ size, inStock }))
        .sort((a, b) => compareSizes(a.size, b.size)),
    }))
    .sort((a, b) => a.price - b.price)

  const savingsResult = computeSavings(groupedOffers, product.brands?.name)

  // Oferta mais barata (a lista já vem ordenada por preço) - usada na barra
  // fixa do telemóvel.
  const bestOffer = groupedOffers[0] ?? null

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



    const productUrl = `${SITE_URL}/produto/${product.slug}`
  const jsonLdImages = (product.image_urls && product.image_urls.length > 0)
      ? product.image_urls
      : product.image_url
        ? [product.image_url]
        : []
    const jsonLd = groupedOffers.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: `${product.brands?.name ?? ''} ${product.model_name}`.trim(),
          image: jsonLdImages,
          ...(product.description ? { description: product.description } : {}),
          ...(product.article_code ? { sku: product.article_code } : {}),
          ...(product.brands?.name ? { brand: { '@type': 'Brand', name: product.brands.name } } : {}),
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'EUR',
            lowPrice: groupedOffers[0].price,
            highPrice: groupedOffers[groupedOffers.length - 1].price,
            offerCount: groupedOffers.length,
            url: productUrl,
            offers: groupedOffers.map((offer) => ({
              '@type': 'Offer',
              price: offer.price,
              priceCurrency: 'EUR',
              availability: 'https://schema.org/InStock',
              url: buildOfferUrl(offer),
              seller: { '@type': 'Organization', name: offer.store },
            })),
          },
        }
      : null

  // Percurso de navegação para o Google (aparece nos resultados em vez do
  // endereço completo).
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Parjusto', item: SITE_URL },
      // A marca leva à página dela (/marcas/nike) - ajuda o Google a ligar
      // os ténis à marca.
      product.brands?.slug
        ? { '@type': 'ListItem', position: 2, name: product.brands.name, item: `${SITE_URL}/marcas/${product.brands.slug}` }
        : { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${SITE_URL}/catalogo` },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${product.brands?.name ?? ''} ${product.model_name}`.trim(),
        item: productUrl,
      },
    ],
  }

  return (

    // pb-28 no telemóvel: espaço para a barra fixa "Melhor preço" no fundo
    // do ecrã não tapar o fim da página.
    <main className="max-w-5xl mx-auto px-6 pt-10 pb-28 md:pb-10 relative overflow-hidden">

      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Saiu a mancha laranja desfocada que ficava por trás do topo da
          página (efeito típico de "site gerado por IA" e cor fora da paleta
          atual do site). */}



      <nav className="mb-4 text-[13px] text-[#5C6770]">

        <Link href="/" className="transition-colors hover:text-[#17232B]">Parjusto</Link>

        <span className="mx-1.5">/</span>

        {product.brands?.slug ? (
          <Link href={`/marcas/${product.brands.slug}`} className="transition-colors hover:text-[#17232B]">
            {product.brands.name}
          </Link>
        ) : (
          <span>{product.brands?.name}</span>
        )}

        <span className="mx-1.5">/</span>

        <span className="text-[#17232B]">{product.model_name}</span>

      </nav>



      <Link href="/catalogo" className="inline-flex min-h-[36px] items-center text-[13px] text-[#5C6770] transition-colors hover:text-[#17232B]">&larr; Voltar</Link>



      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">

        <ProductGallery
          images={product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []}
          alt={`${product.brands?.name} ${product.model_name}`}
          layout="thumbnails"
        />



        <div>

          {/* A marca aparece visível aqui em cima e também dentro do título
              principal (h1), escondida no ecrã - assim o título que o Google
              lê é "adidas Samba OG" e não só "Samba OG", sem mudar o aspeto
              da página. aria-hidden evita que leitores de ecrã a leiam duas
              vezes. */}
          <p aria-hidden="true" className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]">{product.brands?.name}</p>

          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-balance text-[#17232B] md:text-[40px]">{product.brands?.name && <span className="sr-only">{product.brands.name} </span>}{product.model_name}</h1>

            <div className="flex items-center gap-1.5 shrink-0">
              <FavoriteButton slug={product.slug} />
              {groupedOffers.length > 0 && (
                <PriceAlertButton
              productId={product.id}
              currentPrice={groupedOffers[0]?.price ?? null}
              imageUrl={product.image_url}
              brandName={product.brands?.name}
              modelName={product.model_name}
            />
              )}
            </div>
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

            <p className="mt-6 text-[#5C6770]">Sem ofertas disponíveis de momento.</p>

          ) : (

            <>

              {savingsResult && (

                <div className="mt-4 inline-flex items-center rounded-full bg-[#E8F2EF] px-3 py-1.5 text-sm font-medium text-[#123F3A]">Poupa {formatPrice(savingsResult.amount)} face à {savingsResult.officialStore}</div>

              )}



              {/* Saiu "Preços atualizados em <mês>": contradizia o "Verificado
                  há X" de cada loja, que é mais concreto. */}
              <div className="mt-4" />



              <StoreOffersList offers={groupedOffers} productSlug={product.slug} />

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
          <h2 className="mb-4 font-display text-2xl font-bold tracking-[-0.01em] text-[#17232B]">Detalhes do produto</h2>
          <div className="border border-[#17232B]/10 rounded-none overflow-hidden">
            <table className="w-full border-collapse">
              <tbody>
                {specs.map((spec, index) => (
                  <tr key={spec.label} className={index !== specs.length - 1 ? 'border-b border-[#17232B]/10' : ''}>
                    <td className="w-1/3 p-4 align-top text-[11px] font-medium uppercase leading-6 tracking-[0.08em] text-[#5C6770]">{spec.label}</td>
                    <td className="p-4 text-[15px] leading-6 text-[#17232B]">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guias que falam deste ténis (ver lib/guides.ts) - ajudam quem está
          indeciso e ligam as páginas entre si, o que também ajuda no Google. */}
      {getGuidesForProduct(product.slug).map((guide) => (
        <Link
          key={guide.slug}
          href={`/guias/${guide.slug}`}
          className="mt-10 flex items-center justify-between gap-4 rounded-none border border-[#17232B]/10 p-5 transition-colors hover:border-[#17232B]/30"
        >
          <span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]">Guia</span>
            <span className="mt-1 block font-semibold text-[#17232B]">{guide.title}</span>
          </span>
          <span aria-hidden="true" className="text-[#17232B]">→</span>
        </Link>
      ))}

      {showSimilar && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-bold tracking-[-0.01em] text-[#17232B]">Modelos semelhantes</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0">
            {similarProducts.map((p) => (
              <div key={p.id} className="w-44 shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra fixa no telemóvel (pedido do Jorge, análise de conversão):
          no telemóvel o primeiro ecrã só mostrava a foto e o nome - o preço
          e o botão da loja ficavam lá em baixo. Esta barra mostra sempre o
          melhor preço e leva direto à loja. No computador não aparece (a
          lista de lojas já está ao lado da foto). */}
      {bestOffer && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[#17232B]/10 bg-white px-4 pt-3 md:hidden"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]">Melhor preço</p>
              <p className="truncate text-sm text-[#17232B]">
                <span className="text-lg font-bold tabular-nums">{formatPrice(bestOffer.price)}</span>
                <span className="text-[#5C6770]"> na {bestOffer.store}</span>
              </p>
            </div>
            <a
              href={buildOfferUrl(bestOffer)}
              target="_blank"
              rel="nofollow sponsored noopener"
              data-offer-click="barra-telemovel"
              data-offer-product={product.slug}
              data-offer-store={bestOffer.store}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-none bg-[#123F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
            >
              Ver oferta
            </a>
          </div>
        </div>
      )}

    </main>

  )

}
