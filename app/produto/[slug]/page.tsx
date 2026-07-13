// app/produto/[slug]/page.tsx
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 3600 // ISR: 1 hora

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
    <main className="p-8 max-w-3xl mx-auto">
      <Link href="/" className="text-gray-500 text-sm hover:underline">
        &larr; Voltar
      </Link>

      <h1 className="text-2xl font-bold mt-4">
        {product.brands?.name} {product.model_name}
      </h1>

      {offers.length === 0 ? (
        <p className="text-gray-400 mt-4">Sem ofertas disponíveis de momento.</p>
      ) : (
        <table className="w-full mt-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left">
              <th className="p-2">Loja</th>
              <th className="p-2">Tamanho</th>
              <th className="p-2">Preço</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id} className="border-b border-gray-100">
                <td className="p-2">{offer.stores?.name}</td>
                <td className="p-2">{offer.size}</td>
                <td className="p-2 font-semibold">{offer.price.toFixed(2)}€</td>
                <td className="p-2">
                  <a
                    href={offer.affiliate_url}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm inline-block hover:bg-gray-700"
                  >
                    Ver oferta
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}