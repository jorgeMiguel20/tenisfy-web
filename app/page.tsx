// app/page.tsx
import HomeHero from '@/components/HomeHero'
import HomeMarquee from '@/components/HomeMarquee'
import DiferencaPrecos from '@/components/DiferencaPrecos'
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

  // Secção "A diferença que ninguém te mostra" (DiferencaPrecos) - pedido do
  // Jorge (ronda mais recente): deixou de ser um produto escolhido
  // automaticamente (maior poupança do catálogo) e passou a ser SEMPRE o
  // Vans Old Skool - "os vans tem sempre disponível em várias lojas". Preço,
  // lojas e poupança continuam 100% reais e ao vivo (vêm da mesma
  // getProductsWithPrice() de sempre) - só o PRODUTO deixou de ser
  // dinâmico. Se este produto alguma vez ficar com menos de 2 lojas em
  // stock, o componente já sabe não mostrar nada (return null), nunca
  // inventa dados.
  const vansShowcaseProduct =
    productsWithPrice.find((p) => p.slug === 'vans-old-skool-unisex') ?? null

  // Produto para a seccao de alertas de preco: evita repetir o que ja
  // aparece no "Como funciona" ou no "Maior poupanca agora", para a
  // homepage nao mostrar sempre o mesmo tenis em varios sitios (reparado
  // pelo Jorge). So cai para topDeals[0]/vansShowcaseProduct se mesmo assim
  // nao sobrar nenhum candidato diferente.
  const usedProductIds = new Set(
    [vansShowcaseProduct?.id, ...topDeals.map((p) => p.id)].filter((id): id is string => Boolean(id))
  )
  const alertProduct =
    productsWithPrice
      .filter((p) => p.priceDrop && p.gender !== 'crianca' && !usedProductIds.has(p.id))
      .sort((a, b) => b.priceDrop!.amount - a.priceDrop!.amount)[0] ??
    topDeals[0] ??
    vansShowcaseProduct ??
    null

  // Faixa de marcas reais para o HomeMarquee - so marcas que existem mesmo
  // no catalogo carregado agora (nunca uma lista generica inventada).
  const marqueeBrands = Array.from(
    new Set(productsWithPrice.map((p) => p.brands?.name).filter((name): name is string => Boolean(name)))
  ).sort((a, b) => a.localeCompare(b))

  return (
    <main className="max-w-7xl mx-auto px-6 pb-10">
      <HomeHero />

      {/* Foto lifestyle fixa (skate) escolhida pelo Claude a pedido do Jorge
          entre 5 fotos reais que ele enviou - nunca as fotos de catálogo do
          produto (pedido explícito do Jorge, "não quero que utilizes as
          fotos dos cards"), para elevar a qualidade visual da homepage. */}
      <DiferencaPrecos
        product={vansShowcaseProduct}
        heroImageSrc="/marketing/diferenca-precos-vans.jpg"
        heroImageSrcMobile="/marketing/diferenca-precos-vans-mobile.jpg"
      />

      <MaiorPoupancaAgora products={topDeals} />

      <HomeMarquee brands={marqueeBrands} />


      <div className="pt-2">
        <CompararPreview products={compareProducts} />
        <PesquisaPorFoto />
        <ComoFunciona />
        {/* Produto real usado como exemplo na nova seccao de alertas de preco
            (pedido do Jorge, saiu do Hero) - a mesma prioridade do "Como
            funciona": preferir quem tem descida de preco recente, com o
            showcase do "Como funciona" como recurso se nao houver nenhum. */}
        <PriceAlertBanner product={alertProduct} />
      </div>
    </main>
  )
}
