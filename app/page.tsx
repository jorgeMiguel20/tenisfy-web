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
        <p className="text-red-600">Erro ao carregar produtos: {error.message}</p>
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
      <section className="relative overflow-hidden text-center pt-6 sm:pt-8 pb-8 sm:pb-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center"
        >
          <div className="h-72 w-[36rem] rounded-full bg-orange-100/50 blur-3xl" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
          Encontra o par certo.
          <br />
          Ao preço <span className="text-orange-600">certo</span>.
        </h1>
        <p className="mt-4 text-gray-900/60 text-lg max-w-xl mx-auto">
          Compara preços, stock e tamanhos nas melhores lojas.
        </p>
      </section>

      <ProductGrid products={productsWithPrice as any} />
    </main>
  )
}