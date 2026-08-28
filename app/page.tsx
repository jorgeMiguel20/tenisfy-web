// app/page.tsx
import CategoryTiles from '@/components/CategoryTiles'
import HomeHero from '@/components/HomeHero'
import HomeBanner from '@/components/HomeBanner'
import CompararPreview from '@/components/CompararPreview'
import PesquisaPorFoto from '@/components/PesquisaPorFoto'
import ComoFunciona from '@/components/ComoFunciona'
import MaiorPoupancaAgora from '@/components/MaiorPoupancaAgora'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export default async function Home() {
  const { products: productsWithPrice, error } = await getProductsWithPrice()

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-red-600">Erro ao carregar produtos: {error}</p>
      </main>
    )
  }

  // As 3 maiores descidas de preço reais (>=2 pontos de histórico e >=1€ de
  // diferença - ver lib/priceDrop.ts) viram o destaque "Maior poupança
  // agora". A grelha completa (com todas as descidas, sem limite) vive em
  // /catalogo.
  const topDeals = productsWithPrice
    .filter((p) => p.priceDrop)
    .sort((a, b) => b.priceDrop!.amount - a.priceDrop!.amount)
    .slice(0, 3)

  // 2 produtos reais para a prévia do "Comparar" (nunca dados de exemplo
  // inventados) - com foto e preço.
  const compareProducts = pickRandom(
    productsWithPrice.filter((p) => p.image_url && p.lowest_price != null),
    2
  )

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <HomeHero />
      <HomeBanner />

      <CategoryTiles />

      <div className="pt-2">
        <CompararPreview products={compareProducts} />
        <PesquisaPorFoto />
        <ComoFunciona />
        <MaiorPoupancaAgora products={topDeals} />
      </div>
    </main>
  )
}
