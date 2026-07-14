// app/page.tsx
import { supabase } from '@/lib/supabase'
import ProductGrid from '@/components/ProductGrid'

export default async function Home() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      brands (*),
      product_offers (price, in_stock, store_id)
    `)
    .eq('is_active', true)

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tenisfy</h1>
        <p className="text-red-600 mt-2">Erro ao carregar produtos: {error.message}</p>
      </main>
    )
  }

  const productsWithPrice = (products ?? []).map((p) => {
    const inStockOffers = p.product_offers.filter((o: any) => o.in_stock)
    const lowest_price = inStockOffers.length > 0
      ? Math.min(...inStockOffers.map((o: any) => o.price))
      : null
    const distinctStores = new Set(inStockOffers.map((o: any) => o.store_id))
    return { ...p, lowest_price, store_count: distinctStores.size }
  })

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tenisfy</h1>
        <p className="text-gray-500 mt-1">
          Compara preços de ténis nas melhores lojas portuguesas
        </p>
      </header>

      <ProductGrid products={productsWithPrice as any} />
    </main>
  )
}