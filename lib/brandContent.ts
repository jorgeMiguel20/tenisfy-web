// lib/brandContent.ts
//
// Texto de apresentação de cada marca nas páginas /marcas/[slug]. Cada
// página precisa de texto próprio (não só a grelha de ténis) para o Google a
// considerar útil e a mostrar em pesquisas como "ténis Nike preço".
//
// Regras: só factos verificáveis e só modelos que existem mesmo no catálogo
// - nada de números ou promessas inventadas. Quando se juntar uma marca nova
// ao catálogo, acrescentar aqui o texto dela (sem texto, a página usa o
// parágrafo genérico do fim).

export type BrandContent = {
  intro: string
}

const BRAND_CONTENT: Record<string, BrandContent> = {
  nike: {
    intro:
      'Da Nike acompanhamos modelos que nunca saem de moda, como o Air Force 1 ’07 e o Dunk Low. Comparamos o preço de cada par nas lojas portuguesas, com os portes de envio incluídos nas contas, para saberes onde fica mesmo mais barato.',
  },
  adidas: {
    intro:
      'Da adidas temos dos clássicos de inspiração futebolística, como o Samba OG e o Gazelle, ao Campus 00s e ao Forum Low, e ainda o Ultraboost 5 para correr. Comparamos o preço de cada par nas lojas portuguesas, incluindo a loja oficial da marca quando tem stock.',
  },
  'new-balance': {
    intro:
      'Da New Balance acompanhamos o 530, um dos modelos mais procurados da marca, com inspiração nos ténis de corrida dos anos 2000. Comparamos o preço nas lojas portuguesas, com os portes de envio incluídos nas contas.',
  },
  asics: {
    intro:
      'Da Asics acompanhamos o Gel-Kayano 14, um modelo de corrida que voltou a ser muito usado no dia a dia. Comparamos o preço nas lojas portuguesas, com os portes de envio incluídos nas contas.',
  },
  vans: {
    intro:
      'Da Vans acompanhamos o Old Skool, o modelo de skate com a risca lateral que se tornou um clássico do dia a dia. Comparamos o preço nas lojas portuguesas, com os portes de envio incluídos nas contas.',
  },
}

export function getBrandIntro(slug: string, brandName: string): string {
  return (
    BRAND_CONTENT[slug]?.intro ??
    `Compara o preço dos ténis ${brandName} nas lojas portuguesas que acompanhamos, com os portes de envio incluídos nas contas, para saberes onde fica mesmo mais barato.`
  )
}

export const BRAND_PAGE_FOOTNOTE =
  'Verificamos os preços e o stock todos os dias. Se o par que queres ainda não está ao preço certo, cria um alerta e avisamos-te por email quando descer.'
