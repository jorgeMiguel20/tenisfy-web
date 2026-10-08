// lib/guides.ts
//
// Lista dos guias (/guias/...). Cada guia é uma página feita para o Google:
// responde a uma pergunta que as pessoas pesquisam antes de comprar (ex.:
// "Samba ou Gazelle?") e usa sempre os preços reais do site, atualizados
// sozinhos.
//
// Para juntar um guia novo: acrescentar aqui e criar a página em
// app/guias/<slug>/page.tsx. O sitemap, a página /guias e as ligações nas
// páginas dos ténis (productSlugs) atualizam-se sozinhos.

export type Guide = {
  slug: string
  title: string
  description: string
  // Ténis de que o guia fala - a página de cada um mostra uma ligação para
  // o guia.
  productSlugs: string[]
  publishedAt: string // AAAA-MM-DD
}

export const GUIDES: Guide[] = [
  {
    slug: 'samba-vs-gazelle',
    title: 'Samba OG vs Gazelle: qual escolher?',
    description:
      'As diferenças entre os dois clássicos da adidas (material, sola, tamanhos e estilo) e o preço de hoje de cada um nas lojas portuguesas.',
    productSlugs: ['adidas-samba', 'adidas-gazelle'],
    publishedAt: '2026-10-08',
  },
  {
    slug: 'tabela-de-tamanhos-nike-adidas-new-balance',
    title: 'Tabela de tamanhos: Nike vs adidas vs New Balance',
    description:
      'O mesmo pé, três números diferentes. As equivalências entre os tamanhos EU, US e UK da Nike, da adidas e da New Balance, tiradas das tabelas oficiais de cada marca.',
    // Ténis de adulto destas três marcas (o Samba OG Kids fica de fora: a
    // tabela é de adulto).
    productSlugs: [
      'nike-air-force-1',
      'nike-dunk-low',
      'adidas-samba',
      'adidas-gazelle',
      'adidas-campus-00s-core-black',
      'adidas-forum-low-cl-black',
      'adidas-ultraboost-5-preto',
      'new-balance-530',
    ],
    publishedAt: '2026-10-09',
  },
  {
    slug: 'onde-comprar-new-balance-530-mais-barato',
    title: 'Onde comprar o New Balance 530 mais barato',
    description:
      'O preço de hoje do New Balance 530 em cada loja, com portes e tamanhos disponíveis, e o preço mais baixo dos últimos 60 dias.',
    productSlugs: ['new-balance-530'],
    publishedAt: '2026-10-09',
  },
]

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((guide) => guide.slug === slug) ?? null
}

export function getGuidesForProduct(productSlug: string): Guide[] {
  return GUIDES.filter((guide) => guide.productSlugs.includes(productSlug))
}
