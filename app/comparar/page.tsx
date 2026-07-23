// app/comparar/page.tsx
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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ produtos?: string }>
}): Promise<Metadata> {
  const { produtos } = await searchParams
  const slugs = parseSlugs(produtos)

  if (slugs.length === 0) {
    return { title: 'Comparar produtos | Tenisfy' }
  }

  const { data: products } = await supabase
    .from('products')
    .select('slug, model_name')
    .in('slug', slugs)

  const ordered = slugs
    .map((slug) => (products ?? []).find((p) => p.slug === slug))
    .filter(Boolean) as { slug: string; model_name: string }[]

  if (ordered.length === 0) {
    return { title: 'Comparar produtos | Tenisfy' }
  }

  const names = ordered.map((p) => p.model_name).join(' vs ')

  return {
    title: `A comparar: ${names} | Tenisfy`,
    description: `Compara preços entre ${names} nas melhores lojas portuguesas. Encontra o melhor preço no Tenisfy.`,
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

  const gridCols =
    ordered.length === 1
      ? 'grid-cols-1 max-w-sm mx-auto'
      : ordered.length === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/" className="text-gray-500 text-sm hover:underline">
        &larr; Voltar ao catálogo
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-4 mb-8">
        Comparar produtos
      </h1>

      <div className={`grid gap-6 ${gridCols}`}>
        {ordered.map((product) => {
          const offers = groupOffers(product.product_offers ?? [])
          const lowestPrice = offers[0]?.price ?? null

          return (
            <div key={product.id} className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="aspect-square bg-gray-50 rounded-xl mb-4 overflow-hidden relative">
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

              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {product.brands?.name}
              </p>
              <h2 className="font-semibold text-gray-900 mt-0.5">{product.model_name}</h2>

              {lowestPrice ? (
                <p className="text-2xl font-extrabold text-orange-600 mt-2">
                  {lowestPrice.toFixed(2)}€
                </p>
              ) : (
                <p className="text-gray-400 text-sm mt-2">Sem oferta disponível</p>
              )}

              {offers.length > 0 && (
                <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {offers.map((offer, index) => (
                        <tr key={offer.store} className="border-b border-gray-50 last:border-0">
                          <td className="p-3">
                            {offer.store}
                            {index === 0 && offers.length > 1 && (
                              <span className="ml-1.5 inline-flex items-center bg-green-50 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                Melhor preço
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-semibold text-gray-900">
                            {offer.price.toFixed(2)}€
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Link
                href={`/produto/${product.slug}`}
                className="block text-center mt-4 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
              >
                Ver detalhes e comprar
              </Link>
            </div>
          )
        })}
      </div>
    </main>
  )
}
