// app/catalogo/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import ProductGrid from '@/components/ProductGrid'
import RecentDropsGrid from '@/components/RecentDropsGrid'
import CatalogoBackBar from '@/components/CatalogoBackBar'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'

export const metadata: Metadata = {
  title: 'Catálogo | Parjusto',
  description: 'Compara preços, stock e tamanhos de ténis nas principais lojas portuguesas.',
}

// Mesma lógica de ISR da homepage (ver app/page.tsx) - sem isto a página
// ficava presa ao snapshot do build e não refletia descidas de preço novas.
export const dynamic = 'force-dynamic'

export default async function CatalogoPage() {
  const { products: productsWithPrice, error } = await getProductsWithPrice()

  if (error) {
    return (
      <main className="w-full py-10">
        <p className="text-red-600">Erro ao carregar produtos: {error}</p>
      </main>
    )
  }

  const recentDrops = productsWithPrice
    .filter((p) => p.priceDrop)
    .sort((a, b) => b.priceDrop!.amount - a.priceDrop!.amount)


  return (
    // Edge-to-edge na grelha (tal como no Lacoste) - os cards mantêm-se a
    // ocupar a largura toda do ecrã. O título e o breadcrumb, esses, levam
    // um pequeno respiro lateral (px-6) para não ficarem colados à borda,
    // tal como o "SNEAKERS" no site de referência do Jorge.
    <main className="w-full py-10">
      <div className="px-6">
        <CatalogoBackBar />

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Catálogo</h1>
      </div>

      <Suspense fallback={null}>
        <ProductGrid products={productsWithPrice as any} />
      </Suspense>

      {recentDrops.length > 0 && (
        <section className="mt-12 pt-10 border-t border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Descidas de preço recentes</h2>
          <RecentDropsGrid products={recentDrops} />
        </section>
      )}
    </main>
  )
}
