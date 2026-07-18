// app/produto/[slug]/page.tsx
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

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
    return { title: 'Produto não encontrado | Tenisfy' }
  }

  const inStockOffers = (product.product_offers as any[]).filter((o) => o.in_stock)
  const distinctStores = new Set(inStockOffers.map((o: any) => o.store_id))
  const storeCount = distinctStores.size
  const lowestPrice = inStockOffers.length > 0
    ? Math.min(...inStockOffers.map((o: any) => o.price))
    : null

  const title = `${product.brands?.name} ${product.model_name}${lowestPrice ? ` desde ${lowestPrice.toFixed(2)}€` : ''} | Tenisfy`
  const description = `Compara o preço do ${product.brands?.name} ${product.model_name} em ${storeCount} loja${storeCount !== 1 ? 's' : ''} portuguesa${storeCount !== 1 ? 's' : ''}. ${lowestPrice ? `Desde ${lowestPrice.toFixed(2)}€.` : ''} Encontra a melhor oferta no Tenisfy.`

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
        id, size, price, currency, affiliate_url, in_stock,
        stores (name)
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !product) {
    notFound()
  }

  const rawOffers = (product.product_offers as any[]).filter((o) => o.in_stock)

  const grouped: Record<string, GroupedOffer> = {}
  for (const offer of rawOffers) {
    const storeName = offer.stores?.name ?? 'Loja'
    if (!grouped[storeName]) {
      grouped[storeName] = {
        store: storeName,
        sizes: [],
        price: offer.price,
        affiliate_url: offer.affiliate_url,
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

  const updatedLabel = new Date().toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/" className="text-gray-500 text-sm hover:underline">
        &larr; Voltar
      </Link>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden relative">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={`${product.brands?.name} ${product.model_name}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-1">
            {product.model_name}
          </h1>

          {groupedOffers.length === 0 ? (
            <p className="text-gray-400 mt-6">Sem ofertas disponíveis de momento.</p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mt-6 mb-2">
                Preços atualizados em {updatedLabel}
              </p>
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
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
                    {groupedOffers.map((offer) => (
                      <tr key={offer.store} className="border-b border-gray-50 last:border-0">
                        <td className="p-4">{offer.store}</td>
                        <td className="p-4 text-gray-600">{offer.sizes.join(', ')}</td>
                        <td className="p-4 font-bold text-orange-600">{offer.price.toFixed(2)}€</td>
                        <td className="p-4"><a href={offer.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium inline-block hover:bg-orange-600 transition-colors">Ver oferta</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}