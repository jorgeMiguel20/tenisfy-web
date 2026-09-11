// app/page.tsx
import HomeHero from '@/components/HomeHero'
import HomeMarquee from '@/components/HomeMarquee'
import HomeBanner from '@/components/HomeBanner'
import CompararPreview from '@/components/CompararPreview'
import PesquisaPorFoto from '@/components/PesquisaPorFoto'
import ComoFunciona from '@/components/ComoFunciona'
import MaiorPoupancaAgora from '@/components/MaiorPoupancaAgora'
import PriceAlertBanner from '@/components/PriceAlertBanner'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Dentro de um grupo já filtrado por género, tenta escolher os 2 produtos da
// mesma categoria (ex.: dois de running, ou dois lifestyle) para a
// comparação ficar mais realista - sem isso, um ténis de running e um
// lifestyle acabam com quase todas as specs diferentes, o que tira sentido
// ao destaque das diferenças. Quando não há par na mesma categoria (dado em
// falta ou catálogo pequeno), mantém o comportamento anterior: par
// aleatório entre todos os produtos do grupo.
function pickComparePair<T extends { category: string | null }>(group: T[]): T[] {
  const byCategory: Record<string, T[]> = {}
  for (const product of group) {
    if (!product.category) continue
    ;(byCategory[product.category] ??= []).push(product)
  }
  const categoriesWithPair = Object.values(byCategory).filter((list) => list.length >= 2)
  if (categoriesWithPair.length > 0) {
    return pickRandom(categoriesWithPair[Math.floor(Math.random() * categoriesWithPair.length)], 2)
  }
  return pickRandom(group, 2)
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
  // inventados) - com foto e preço. Nunca compara calçado de criança com
  // adulto (pedido do Jorge): os 2 vêm sempre do mesmo grupo - mesma regra
  // já aplicada ao destaque "Maior poupança agora" acima. Dentro do grupo,
  // pickComparePair tenta um par da mesma categoria (ver função acima).
  const compareCandidates = productsWithPrice.filter((p) => p.image_url && p.lowest_price != null)
  const compareGroups = [
    compareCandidates.filter((p) => p.gender !== 'crianca'),
    compareCandidates.filter((p) => p.gender === 'crianca'),
  ].filter((group) => group.length >= 2)
  const compareProducts = compareGroups.length > 0
    ? pickComparePair(compareGroups[Math.floor(Math.random() * compareGroups.length)])
    : []

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

  // Produto para a seccao de alertas de preco: evita repetir o que ja
  // aparece no "Como funciona" ou no "Maior poupanca agora", para a
  // homepage nao mostrar sempre o mesmo tenis em varios sitios (reparado
  // pelo Jorge). So cai para topDeals[0]/showcaseProduct se mesmo assim
  // nao sobrar nenhum candidato diferente.
  const usedProductIds = new Set(
    [showcaseProduct?.id, ...topDeals.map((p) => p.id)].filter((id): id is string => Boolean(id))
  )
  const alertProduct =
    productsWithPrice
      .filter((p) => p.priceDrop && p.gender !== 'crianca' && !usedProductIds.has(p.id))
      .sort((a, b) => b.priceDrop!.amount - a.priceDrop!.amount)[0] ??
    topDeals[0] ??
    showcaseProduct ??
    null

  // Atalhos de pesquisa "Populares" no Hero: os 3 modelos reais com mais
  // lojas comparaveis agora, nunca uma lista fixa (ideia do redesign que o
  // Jorge preparou no Claude Design, adaptada a dados verdadeiros).
  const popularSearches = [...productsWithPrice]
    .filter((p) => (p.store_count ?? 0) > 0)
    .sort((a, b) => (b.store_count ?? 0) - (a.store_count ?? 0))
    .filter((p, i, arr) => arr.findIndex((x) => x.model_name === p.model_name) === i)
    .slice(0, 3)
    .map((p) => ({ label: p.model_name, href: `/catalogo?q=${encodeURIComponent(p.model_name)}` }))

  // Faixa de marcas reais para o HomeMarquee - so marcas que existem mesmo
  // no catalogo carregado agora (nunca uma lista generica inventada).
  const marqueeBrands = Array.from(
    new Set(productsWithPrice.map((p) => p.brands?.name).filter((name): name is string => Boolean(name)))
  ).sort((a, b) => a.localeCompare(b))

  return (
    <main className="max-w-7xl mx-auto px-6 pb-10">
      <HomeHero popularSearches={popularSearches} />

      <HomeMarquee brands={marqueeBrands} />

      <HomeBanner />

      <div className="pt-2">
        <CompararPreview products={compareProducts} />
        <PesquisaPorFoto />
        <ComoFunciona showcaseProduct={showcaseProduct} hasNextSection={topDeals.length > 0} />
        <MaiorPoupancaAgora products={topDeals} />
        {/* Produto real usado como exemplo na nova seccao de alertas de preco
            (pedido do Jorge, saiu do Hero) - a mesma prioridade do "Como
            funciona": preferir quem tem descida de preco recente, com o
            showcase do "Como funciona" como recurso se nao houver nenhum. */}
        <PriceAlertBanner product={alertProduct} />
      </div>
    </main>
  )
}
