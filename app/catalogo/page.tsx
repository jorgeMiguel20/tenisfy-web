// app/catalogo/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import ProductGrid from '@/components/ProductGrid'
import ProductCard from '@/components/ProductCard'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'

export const metadata: Metadata = {
  title: 'Catálogo | Parjusto',
  description: 'Compara preços, stock e tamanhos de ténis nas principais lojas portuguesas.',
}

export default async function CatalogoPage() {
  const { products: productsWithPrice, error } = await getProductsWithPrice()

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-red-600">Erro ao carregar produtos: {error}</p>
      </main>
    )
  }

  // Aqui a grelha é o conteúdo principal da página, por isso mostra-se
  // sempre a lista completa de descidas de preço (sem limite a 3, ao
  // contrário do destaque "Maior poupança agora" da homepage).
  const recentDrops = productsWithPrice
    .filter((p) => p.priceDrop)
    .sort((a, b) => b.priceDrop!.amount - a.priceDrop!.amount)

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Catálogo</h1>

      <Suspense fallback={null}>
        <ProductGrid products={productsWithPrice as any} />
      </Suspense>

      {recentDrops.length > 0 && (
        <section className="mt-12 pt-10 border-t border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Descidas de preço recentes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
            {recentDrops.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
