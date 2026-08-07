// app/comparar/page.tsx
import { Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

function parseSlugs(produtos?: string): string[] {
  return (produtos ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
}

function formatPrice(value: number): string {
  return Number.isInteger(value) ? `${value}€` : `${value.toFixed(2)}€`
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

function ComparePlaceholder({ existingSlugs }: { existingSlugs: string[] }) {
  const href = existingSlugs.length > 0 ? `/?comparar=${existingSlugs.join(',')}` : '/'

  return (
    <Link
      href={href}
      className="flex min-h-[280px] h-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
    >
      <span className="text-2xl leading-none">+</span>
      <span className="text-sm font-semibold">Adicionar produto para comparar</span>
    </Link>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-500 mt-2">{description}</p>
      <Link
        href="/"
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

  if (slugs.length === 0) {
    return (
      <EmptyState
        title="Nada para comparar ainda"
        description='Escolhe até 3 produtos no catálogo usando o botão "Comparar".'
      />
    )
  }

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

  const ordered = slugs
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

  // Com menos de 3 produtos reais, preenche os lugares em falta com
  // placeholders "+ Adicionar produto" (grid mantém-se sempre a 3 colunas)
  // e contém a página numa largura mais estreita, centrada.
  const placeholderCount = Math.max(0, 3 - ordered.length)
  const containerMaxWidth = ordered.length < 3 ? 'max-w-4xl' : 'max-w-5xl'

  // Specs cujo valor difere entre os produtos apresentados (para destacar)
  const differingLabels = new Set(
    SPEC_DEFS.filter(({ key }) => {
      const values = ordered.map((p) => p[key]).filter(Boolean)
      return new Set(values).size > 1
    }).map(({ label }) => label)
  )

  return (
    <main className={`${containerMaxWidth} mx-auto px-6 py-10`}>
      <Link href="/" className="text-gray-500 text-sm hover:underline">
        &larr; Voltar ao catálogo
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-4 mb-8">
        Comparar produtos
      </h1>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {ordered.map((product) => {
          const offers = groupOffers(product.product_offers ?? [])
          const lowestPrice = offers[0]?.price ?? null

          const specs = SPEC_DEFS.map(({ key, label }) => ({ label, value: product[key] })).filter(
            (spec) => spec.value
          )

          const remainingSlugs = slugs.filter((s) => s !== product.slug)
          const removeHref =
            remainingSlugs.length > 0 ? `/comparar?produtos=${remainingSlugs.join(',')}` : '/comparar'

          return (
            <div
              key={product.id}
              className="relative flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6"
            >
              <Link
                href={removeHref}
                aria-label={`Remover ${product.model_name} da comparação`}
                className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-sm hover:border-gray-300 hover:text-gray-700 transition-colors"
              >
                <span aria-hidden="true">&times;</span>
              </Link>

              <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden relative">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.model_name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-300 text-sm">Sem imagem disponível</span>
                  </div>
                )}
              </div>

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
          <ComparePlaceholder key={`placeholder-${i}`} existingSlugs={slugs} />
        ))}
      </div>
    </main>
  )
}
