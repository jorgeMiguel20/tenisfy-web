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
]

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((guide) => guide.slug === slug) ?? null
}

export function getGuidesForProduct(productSlug: string): Guide[] {
  return GUIDES.filter((guide) => guide.productSlugs.includes(productSlug))
}
