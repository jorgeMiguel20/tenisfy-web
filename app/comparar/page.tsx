// app/comparar/page.tsx
import { Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Metadata } from 'next'
import ComparePicker from '@/components/ComparePicker'
import ProductGallery from '@/components/ProductGallery'
import RemoveCompareButton from '@/components/RemoveCompareButton'
import CompareSelectionSync from '@/components/CompareSelectionSync'
import CompareRestoreFromStorage from '@/components/CompareRestoreFromStorage'
import type { ProductWithPrice } from '@/lib/types'
import { formatPrice } from '@/lib/formatPrice'

function parseSlugs(produtos?: string): string[] {
  return (produtos ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ produtos?: string }>
}): Promise<Metadata> {
  const { produtos } = await searchParams
  const slugs = parseSlugs(produtos)

  if (slugs.length === 0) {
    return { title: 'Comparar produtos | Parjusto' }
  }

  const { data: products } = await supabase
    .from('products')
    .select('slug, model_name')
    .in('slug', slugs)

  const ordered = slugs
    .map((slug) => (products ?? []).find((p) => p.slug === slug))
    .filter(Boolean) as { slug: string; model_name: string }[]

  if (ordered.length === 0) {
    return { title: 'Comparar produtos | Parjusto' }
  }

  const names = ordered.map((p) => p.model_name).join(' vs ')

  return {
    title: `A comparar: ${names} | Parjusto`,
    description: `Compara preços entre ${names} nas melhores lojas. Encontra o melhor preço no Parjusto.`,
  }
}

type GroupedOffer = {
  store: string
  price: number
}

function groupOffers(offers: any[]): GroupedOffer[] {
  const inStock = offers.filter((o) => o.in_stock)
  const grouped: Record<string, GroupedOffer> = {}

  for (const offer of inStock) {
    const storeName = offer.stores?.name ?? 'Loja'
    if (!grouped[storeName] || offer.price < grouped[storeName].price) {
      grouped[storeName] = { store: storeName, price: offer.price }
    }
  }

  return Object.values(grouped).sort((a, b) => a.price - b.price)
}

const SPEC_DEFS = [
  { key: 'material', label: 'Material' },
  { key: 'sole_type', label: 'Sola' },
  { key: 'closure_type', label: 'Fecho' },
  { key: 'color', label: 'Cor' },
  { key: 'article_code', label: 'Ref' },
] as const

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-500 mt-2">{description}</p>
      <Link
        href="/catalogo"
        className="inline-block mt-6 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        Ver catálogo
      </Link>
    </main>
  )
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ produtos?: string }>
}) {
  const { produtos } = await searchParams
  const slugs = parseSlugs(produtos)

  let ordered: any[] = []
  if (slugs.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select(`
        *,
        brands (*),
        product_offers (
          id, price, in_stock,
          stores (name)
        )
      `)
      .in('slug', slugs)

    ordered = slugs
      .map((slug) => (products ?? []).find((p) => p.slug === slug))
      .filter(Boolean) as any[]

    if (ordered.length === 0) {
      return (
        <EmptyState
          title="Produtos não encontrados"
          description="Os produtos que tentaste comparar já não estão disponíveis."
        />
      )
    }
  }

  // Com menos de 3 produtos reais, preenche os lugares em falta com
  // placeholders "+ Adicionar produto" (grid mantém-se sempre a 3 colunas)
  // e contém a página numa largura mais estreita, centrada.
  const placeholderCount = Math.max(0, 3 - ordered.length)
  const containerMaxWidth = ordered.length < 3 ? 'max-w-4xl' : 'max-w-5xl'

  // Catálogo completo para o seletor "+ Adicionar produto" (mesma pesquisa
  // client-side da homepage, ver lib/searchProducts.ts) - só é preciso
  // quando sobra pelo menos um lugar por preencher.
  let pickerProducts: ProductWithPrice[] = []
  if (placeholderCount > 0) {
    const { data: allProducts } = await supabase
      .from('products')
      .select(`
        *,
        brands (*),
        product_offers (price, in_stock, store_id, size)
      `)
      .eq('is_active', true)

    pickerProducts = (allProducts ?? []).map((p) => {
      const inStockOffers = p.product_offers.filter((o: any) => o.in_stock)
      const lowest_price = inStockOffers.length > 0
        ? Math.min(...inStockOffers.map((o: any) => o.price))
        : null
      const distinctStores = new Set(inStockOffers.map((o: any) => o.store_id))
      const sizes = Array.from(new Set(inStockOffers.map((o: any) => o.size))) as string[]
      return { ...p, lowest_price, store_count: distinctStores.size, sizes }
    })
  }

  // Specs cujo valor difere entre os produtos apresentados (para destacar)
  const differingLabels = new Set(
    SPEC_DEFS.filter(({ key }) => {
      const values = ordered.map((p) => p[key]).filter(Boolean)
      return new Set(values).size > 1
    }).map(({ label }) => label)
  )

  return (
    <main className={`${containerMaxWidth} mx-auto px-6 py-10`}>
      {/* Só sincroniza a seleção partilhada quando o URL traz um ?produtos=
          explícito - visitar /comparar "em branco" não deve apagar uma
          seleção já feita algures (ex.: header, barra flutuante). */}
      {slugs.length > 0 && <CompareSelectionSync slugs={ordered.map((p) => p.slug)} />}

      {/* Sentido inverso: URL vazio mas já pode haver uma seleção guardada
          (localStorage) - restaura-a para o URL em vez de mostrar a página vazia. */}
      {slugs.length === 0 && <CompareRestoreFromStorage />}

      <Link href="/catalogo" className="text-gray-500 text-sm hover:underline">
        &larr; Voltar ao catálogo
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-4 mb-2">
        Comparar produtos
      </h1>

      {placeholderCount > 0 && (
        <p className="text-sm text-gray-500 mb-8">
          Escolhe até 3 produtos no catálogo para comparar.
        </p>
      )}

      <div className={`grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${placeholderCount === 0 ? 'mt-8' : ''}`}>
        {ordered.map((product) => {
          const offers = groupOffers(product.product_offers ?? [])
          const lowestPrice = offers[0]?.price ?? null

          const specs = SPEC_DEFS.map(({ key, label }) => ({ label, value: product[key] })).filter(
            (spec) => spec.value
          )

          const remainingSlugs = slugs.filter((s) => s !== product.slug)

          return (
            <div
              key={product.id}
              className="relative flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6"
            >
              <RemoveCompareButton remainingSlugs={remainingSlugs} label={product.model_name} />

              <ProductGallery
                images={product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []}
                alt={product.model_name}
                compact
                imageBoxClassName="aspect-square"
                sizes="(max-width: 768px) 100vw, 33vw"
              />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {product.brands?.name}
                </p>
                <h2 className="font-semibold text-gray-900 mt-0.5">{product.model_name}</h2>
              </div>

              {lowestPrice ? (
                <p className="text-2xl font-extrabold text-orange-600">{formatPrice(lowestPrice)}</p>
              ) : (
                <p className="text-gray-400 text-sm">Sem oferta disponível</p>
              )}

              {specs.length > 0 && (
                <div className="space-y-1.5 text-sm">
                  {specs.map((spec) => {
                    const isDifferent = differingLabels.has(spec.label)
                    return (
                      <p
                        key={spec.label}
                        className={isDifferent ? '-mx-2 rounded-md bg-orange-50 px-2 py-1' : ''}
                      >
                        <span className={isDifferent ? 'font-semibold text-gray-900' : 'font-semibold text-gray-700'}>
                          {spec.label}:
                        </span>{' '}
                        <span className={isDifferent ? 'font-medium text-gray-800' : 'text-gray-600'}>
                          {spec.value}
                        </span>
                      </p>
                    )
                  })}
                </div>
              )}

              {offers.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {/* Colunas 1 e 2 podem encolher/quebrar linha se o espaço for
                      apertado (minmax(0,...)); a coluna do preço fica sempre
                      "auto" pura, sem encolher, para nunca cortar o valor. */}
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto] items-center text-sm">
                    {offers.map((offer, index) => {
                      const isLast = index === offers.length - 1
                      const cellBorder = isLast ? '' : 'border-b border-gray-50'
                      return (
                        <Fragment key={offer.store}>
                          <div className={`p-3 text-gray-700 ${cellBorder}`}>{offer.store}</div>
                          <div className={`p-3 text-center ${cellBorder}`}>
                            {index === 0 && offers.length > 1 && (
                              <span className="inline-flex items-center bg-green-50 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                Melhor preço
                              </span>
                            )}
                          </div>
                          <div className={`p-3 text-right font-semibold text-gray-900 whitespace-nowrap ${cellBorder}`}>
                            {formatPrice(offer.price)}
                          </div>
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex-1" />

              <Link
                href={`/produto/${product.slug}`}
                className="flex items-center justify-center w-full min-h-[48px] rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Ver detalhes e comprar
              </Link>
            </div>
          )
        })}

        {Array.from({ length: placeholderCount }).map((_, i) => (
          <ComparePicker key={`placeholder-${i}`} allProducts={pickerProducts} currentSlugs={slugs} />
        ))}
      </div>
    </main>
  )
}
