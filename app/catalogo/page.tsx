// app/catalogo/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import ProductGrid from '@/components/ProductGrid'
import RecentDropsGrid from '@/components/RecentDropsGrid'
import CatalogoBackBar from '@/components/CatalogoBackBar'
import BackToTopButton from '@/components/BackToTopButton'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'
import type { ProductWithPrice } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Catálogo de ténis: compara preços nas lojas portuguesas | Parjusto',
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

// Só os campos que a grelha, os filtros e os cartões usam. Com milhares de
// ténis (importação automática das lojas afiliadas), mandar para o browser
// as ofertas de cada tamanho, descrições, etc. tornava o catálogo pesado.
// As fotos extra do cartão (que se veem ao deslizar no telemóvel) ficam
// limitadas a 3 por ténis.
function slimForGrid(p: ProductWithPrice): ProductWithPrice {
  return {
    id: p.id,
    brand_id: p.brand_id,
    model_name: p.model_name,
    slug: p.slug,
    category: p.category,
    gender: p.gender,
    color: p.color,
    base_colors: p.base_colors,
    color_variant_group: null,
    image_urls: (p.image_urls ?? []).slice(0, 3),
    description: null,
    image_url: p.image_url,
    is_active: p.is_active,
    created_at: p.created_at,
    brands: { id: p.brands?.id, name: p.brands?.name, slug: p.brands?.slug, logo_url: null } as ProductWithPrice['brands'],
    lowest_price: p.lowest_price,
    store_count: p.store_count,
    sizes: p.sizes,
    savings: p.savings ?? null,
    priceDrop: p.priceDrop ?? null,
  }
}

// Ordem "Relevância": primeiro os ténis escolhidos à mão (pela ordem de
// sempre), depois os importados das lojas afiliadas - os que estão em mais
// lojas primeiro (são os que mais vale a pena comparar), depois os que
// estão com desconto, depois os mais recentes.
function relevanceOrder(products: ProductWithPrice[]): ProductWithPrice[] {
  const curated = products.filter((p) => !(p as { source?: string | null }).source)
  const imported = products.filter((p) => (p as { source?: string | null }).source)
  const withStock = (p: ProductWithPrice) => (p.lowest_price != null ? 1 : 0)
  imported.sort(
    (a, b) =>
      withStock(b) - withStock(a) ||
      (b.store_count ?? 0) - (a.store_count ?? 0) ||
      (b.priceDrop ? 1 : 0) - (a.priceDrop ? 1 : 0) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return [...curated, ...imported]
}

export default async function CatalogoPage() {
  const { products: productsWithPrice, error } = await getProductsWithPrice()

  if (error) {
    return (
      <main className="w-full py-10">
        <p className="text-red-600">Erro ao carregar produtos: {error}</p>
      </main>
    )
  }

  const gridProducts = relevanceOrder(productsWithPrice).map(slimForGrid)

  // "Descidas de preço recentes" (fundo da página): só os ténis escolhidos à
  // mão e no máximo 8, como até agora - com milhares de ténis importados a
  // secção ficaria enorme.
  const recentDrops = productsWithPrice
    .filter((p) => p.priceDrop && !(p as { source?: string | null }).source)
    .sort((a, b) => b.priceDrop!.amount - a.priceDrop!.amount)
    .slice(0, 8)
    .map(slimForGrid)


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
        <ProductGrid products={gridProducts} />
      </Suspense>

      {recentDrops.length > 0 && (
        <section className="mt-12 border-t border-[#17232B]/10 px-6 pt-10">
          <h2 className="mb-4 font-display text-2xl font-bold tracking-[-0.01em] text-[#17232B]">Descidas de preço recentes</h2>
          <RecentDropsGrid products={recentDrops} />
        </section>
      )}

      <BackToTopButton />
    </main>
  )
}
