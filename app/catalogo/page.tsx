// app/catalogo/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import ProductGrid from '@/components/ProductGrid'
import RecentDropsGrid from '@/components/RecentDropsGrid'
import CatalogoBackBar from '@/components/CatalogoBackBar'
import BackToTopButton from '@/components/BackToTopButton'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'
import { getCatalogGridFromCache } from '@/lib/catalogGridCache'
import { relevanceOrder } from '@/lib/relevanceOrder'
import { slimForGrid } from '@/lib/slimForGrid'
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

export default async function CatalogoPage() {
  // Caminho normal: lê o "resumo do catálogo" (uma linha por ténis, já
  // calculada e ordenada por "Relevância" - ver lib/catalogGridCache.ts e
  // scripts/refresh-catalog.mjs). Demora segundos, em vez dos minutos que
  // levava a calcular tudo a partir das ofertas de cada tamanho.
  let gridProducts: ProductWithPrice[]
  let recentDrops: ProductWithPrice[]
  const cached = await getCatalogGridFromCache()
  if (cached) {
    gridProducts = cached.map((row) => row.slim)
    // "Descidas de preço recentes" (fundo da página): só os ténis escolhidos
    // à mão e no máximo 8, como até agora - com milhares de ténis
    // importados a secção ficaria enorme.
    recentDrops = cached
      .filter((row) => row.is_curated && row.slim.priceDrop)
      .sort((a, b) => b.slim.priceDrop!.amount - a.slim.priceDrop!.amount)
      .slice(0, 8)
      .map((row) => row.slim)
  } else {
    // Plano B (resumo vazio ou com erro): calcula tudo como antes.
    const { products: productsWithPrice, error } = await getProductsWithPrice()

    // Se a base de dados falhar, não se guarda uma página de erro: o site
    // continua a mostrar a última versão boa do catálogo (cache de 1 hora) e
    // tenta outra vez mais tarde. Antes, a mensagem "Erro ao carregar
    // produtos" ficava guardada e aparecia a toda a gente durante 1 hora.
    if (error) {
      throw new Error(`Catálogo: erro ao carregar produtos (${error})`)
    }

    gridProducts = relevanceOrder(productsWithPrice).map(slimForGrid)
    recentDrops = productsWithPrice
      .filter((p) => p.priceDrop && !(p as { source?: string | null }).source)
      .sort((a, b) => b.priceDrop!.amount - a.priceDrop!.amount)
      .slice(0, 8)
      .map(slimForGrid)
  }

  return (
    // Edge-to-edge na grelha (tal como no Lacoste) - os cards mantêm-se a
    // ocupar a largura toda do ecrã. O título e o breadcrumb, esses, levam
    // um pequeno respiro lateral (px-6) para não ficarem colados à borda,
    // tal como o "SNEAKERS" no site de referência do Jorge.
    <main className="w-full py-10">
      <div className="px-6">
        <CatalogoBackBar />
      </div>

      {/* O título "Catálogo" vive dentro da grelha (passa a "Resultados para
          ..." quando há uma pesquisa). Enquanto a grelha não carrega, mostra-se
          este mesmo título, que também fica no HTML para o Google. */}
      <Suspense
        fallback={
          <div className="px-6">
            <h1 className="mt-2 mb-8 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B] md:text-[44px]">Catálogo</h1>
          </div>
        }
      >
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
