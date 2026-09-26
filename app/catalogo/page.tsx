// app/catalogo/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import ProductGrid from '@/components/ProductGrid'
import RecentDropsGrid from '@/components/RecentDropsGrid'
import CatalogoBackBar from '@/components/CatalogoBackBar'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'

export const metadata: Metadata = {
  title: 'Catálogo | Parjusto',
  description: 'Compara preços, stock e tamanhos de ténis Nike, adidas, New Balance, Asics e Vans nas principais lojas portuguesas.',
  // ?genero=, ?q= e ?comparar= mostram a mesma página filtrada no browser -
  // o endereço oficial é sempre /catalogo.
  alternates: { canonical: '/catalogo' },
}

// Cache de 1 hora, como a homepage e as páginas de produto (ISR). Antes
// estava "force-dynamic": a página era gerada de raiz em cada visita
// (0,7-1,1 s de espera no servidor, medido). Os filtros (?genero=, ?q=) são
// lidos no browser pelo ProductGrid, por isso a cache serve para todos.
export const revalidate = 3600

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

        <h1 className="mt-2 mb-8 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B] md:text-[44px]">Catálogo</h1>
      </div>

      <Suspense fallback={null}>
        <ProductGrid products={productsWithPrice as any} />
      </Suspense>

      {recentDrops.length > 0 && (
        <section className="mt-12 border-t border-[#17232B]/10 px-6 pt-10">
          <h2 className="mb-4 font-display text-2xl font-bold tracking-[-0.01em] text-[#17232B]">Descidas de preço recentes</h2>
          <RecentDropsGrid products={recentDrops} />
        </section>
      )}
    </main>
  )
}
