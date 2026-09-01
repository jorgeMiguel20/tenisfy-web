// app/page.tsx
import CategoryTiles from '@/components/CategoryTiles'
import HomeHero from '@/components/HomeHero'
import HomeBanner from '@/components/HomeBanner'
import CompararPreview from '@/components/CompararPreview'
import PesquisaPorFoto from '@/components/PesquisaPorFoto'
import ComoFunciona from '@/components/ComoFunciona'
import MaiorPoupancaAgora from '@/components/MaiorPoupancaAgora'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'
import Link from 'next/link'

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Homepage era totalmente estática (dados presos ao snapshot do build) - com
// revalidate a Next.js volta a ir buscar dados novos à Supabase de X em X
// tempo (ISR), sem precisar de um build novo sempre que os preços mudam.
export const revalidate = 3600

export default async function Home() {
  const { products: productsWithPrice, error } = await getProductsWithPrice()

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-red-600">Erro ao carregar produtos: {error}</p>
      </main>
    )
  }

  // As 4 maiores descidas de preço reais (>=2 pontos de histórico e >=1€ de
  // diferença - ver lib/priceDrop.ts) viram o destaque "Maior poupança
  // agora". Nunca ténis de criança neste destaque - fica sempre reservado a
  // pares de adulto (pedido do Jorge). A grelha completa (com todas as
  // descidas, sem limite nem exclusão de género) vive em /catalogo.
  const topDeals = productsWithPrice
    .filter((p) => p.priceDrop && p.gender !== 'crianca')
    .sort((a, b) => b.priceDrop!.amount - a.priceDrop!.amount)
    .slice(0, 4)


  // 2 produtos reais para a prévia do "Comparar" (nunca dados de exemplo
  // inventados) - com foto e preço.
  const compareProducts = pickRandom(
    productsWithPrice.filter((p) => p.image_url && p.lowest_price != null),
    2
  )

  // Produto real usado nos passos 2 e 3 do "Como funciona" (tabela de preços
  // por loja + cartão de poupança - ver components/ComoFunciona.tsx). Nunca
  // os números fixos do mockup: preferimos um produto com descida de preço
  // recente e várias lojas comparáveis; sem isso, o que tiver a maior
  // poupança entre lojas. Se nada qualificar, ComoFunciona usa as imagens
  // estáticas originais para esses passos.
  const showcaseCandidates = productsWithPrice
    .filter((p) => p.savings && (p.store_count ?? 0) >= 2)
    .sort((a, b) => {
      const aHasDrop = a.priceDrop ? 1 : 0
      const bHasDrop = b.priceDrop ? 1 : 0
      if (aHasDrop !== bHasDrop) return bHasDrop - aHasDrop
      return (b.savings?.amount ?? 0) - (a.savings?.amount ?? 0)
    })
  const showcaseProduct = showcaseCandidates[0] ?? null

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <HomeHero />

      <CategoryTiles />
      <HomeBanner />

      <div className="pt-2">
        <CompararPreview products={compareProducts} />
        <PesquisaPorFoto />
        <ComoFunciona showcaseProduct={showcaseProduct} hasNextSection={topDeals.length > 0} />
        <MaiorPoupancaAgora products={topDeals} />
      </div>

      <Link
        href="/catalogo"
        className="sm:hidden fixed bottom-4 inset-x-4 z-50 flex items-center justify-center gap-2 rounded-full bg-orange-600 py-3 text-center font-semibold text-white shadow-lg shadow-orange-600/30 active:scale-95 transition-transform"
      >
        Ver catálogo
      </Link>
    </main>
  )
}
