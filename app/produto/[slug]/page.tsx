// app/produto/[slug]/page.tsx
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 3600 // ISR: 1 hora, conforme a regra de cache do projeto

export async function generateStaticParams() {
  const { data: products } = await supabase.from('products').select('slug')
  return (products ?? []).map((p) => ({ slug: p.slug }))
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

  const offers = (product.product_offers as any[])
    .filter((o) => o.in_stock)
    .sort((a, b) => a.price - b.price)

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/" className="text-gray-500 text-sm hover:underline">
        &larr; Voltar
      </Link>

      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mt-4">
        {product.brands?.name}
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-1">
        {product.model_name}
      </h1>

      {offers.length === 0 ? (
        <p className="text-gray-400 mt-6">Sem ofertas disponíveis de momento.</p>
      ) : (
        <div className="mt-8 border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-left bg-gray-50">
                <th className="p-4 text-sm font-medium text-gray-500">Loja</th>
                <th className="p-4 text-sm font-medium text-gray-500">Tamanho</th>
                <th className="p-4 text-sm font-medium text-gray-500">Preço</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} className="border-b border-gray-50 last:border-0">
                  <td className="p-4">{offer.stores?.name}</td>
                  <td className="p-4">{offer.size}</td>
                  <td className="p-4 font-bold text-orange-600">{offer.price.toFixed(2)}€</td>
                  <td className="p-4">
                    <a
                      href={offer.affiliate_url}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium inline-block hover:bg-orange-600 transition-colors"
                    >
                      Ver oferta
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}