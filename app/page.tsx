// app/page.tsx
import { supabase } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'

export default async function Home() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      brands (*),
      product_offers (price, in_stock)
    `)
    .eq('is_active', true)

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Tenisfy</h1>
        <p className="text-red-600 mt-2">Erro ao carregar produtos: {error.message}</p>
      </main>
    )
  }

  const productsWithPrice = (products ?? []).map((p) => {
    const inStockOffers = p.product_offers.filter((o: any) => o.in_stock)
    const lowest_price = inStockOffers.length > 0
      ? Math.min(...inStockOffers.map((o: any) => o.price))
      : null
    return { ...p, lowest_price, store_count: inStockOffers.length }
  })

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Tenisfy</h1>
      <p className="text-gray-500 mb-6">
        Compara preços de ténis nas melhores lojas portuguesas
      </p>

      {productsWithPrice.length === 0 ? (
        <p className="text-gray-400">Ainda não há produtos disponíveis.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {productsWithPrice.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      )}
    </main>
  )
}