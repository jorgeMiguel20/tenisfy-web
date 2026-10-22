// app/marcas/page.tsx
//
// Lista de marcas (link "Marcas" do menu), de A a Z, só com texto - sem
// fotos de ténis (pedido do Jorge, 2026-10-19). Cada marca leva à sua
// página própria (/marcas/[slug]), feita para aparecer no Google em
// pesquisas como "ténis Nike preço", e essa sim mostra os ténis.
//
// Em cima fica a barra das letras A-Z, sempre visível ao descer a página
// (as letras sem marcas ficam a cinzento claro). Por baixo, cada letra com
// as suas marcas em colunas e o número de modelos de cada uma.
import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fetchAll } from '@/lib/fetchAll'
import { SITE_URL } from '@/lib/siteUrl'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Marcas de ténis: Nike, adidas, New Balance e mais | Parjusto',
  description:
    'Todas as marcas de ténis do Parjusto, de A a Z. Escolhe a marca e compara o preço de cada modelo nas lojas portuguesas.',
  alternates: { canonical: '/marcas' },
}

const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const LETTER_LINK =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center text-sm font-semibold text-[#17232B] transition-colors hover:bg-[#17232B] hover:text-white sm:h-[34px] sm:w-[34px]'

type BrandRow = { id: string; name: string; slug: string }
type BrandItem = BrandRow & { count: number }

// Letra de cada marca: sem acentos ("Élan" fica no E); as que começam por
// número ou símbolo ficam em "#".
function letterOf(name: string) {
  const first = name.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase()
  return /[A-Z]/.test(first) ? first : '#'
}

export default async function MarcasPage() {
  const [{ data: brandRows }, { data: activeProducts }] = await Promise.all([
    supabase.from('brands').select('id, name, slug'),
    // Só os ténis visíveis no site, para contar quantos modelos tem cada
    // marca (inclui os que chegaram com a importação automática das lojas).
    fetchAll<{ brand_id: string }>((from, to) =>
      supabase.from('products').select('brand_id').eq('is_active', true).order('id').range(from, to)
    ),
  ])

  const countByBrand = new Map<string, number>()
  for (const product of activeProducts) {
    countByBrand.set(product.brand_id, (countByBrand.get(product.brand_id) ?? 0) + 1)
  }

  const brands: BrandItem[] = ((brandRows ?? []) as BrandRow[])
    .map((brand) => ({ ...brand, count: countByBrand.get(brand.id) ?? 0 }))
    .filter((brand) => brand.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }))

  const groups = new Map<string, BrandItem[]>()
  for (const brand of brands) {
    const letter = letterOf(brand.name)
    if (!groups.has(letter)) groups.set(letter, [])
    groups.get(letter)!.push(brand)
  }
  const letters = [...(groups.has('#') ? ['#'] : []), ...ALPHABET.filter((l) => groups.has(l))]

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Parjusto', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Marcas', item: `${SITE_URL}/marcas` },
    ],
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <nav className="text-[13px] text-[#5C6770]">
        <Link href="/" className="transition-colors hover:text-[#17232B]">
          Parjusto
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#17232B]">Marcas</span>
      </nav>

      <header className="mt-6 max-w-2xl">
        <p className={LABEL}>Marcas</p>
        <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B] sm:text-[44px]">
          Marcas de ténis
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#5C6770]">
          Escolhe a marca e compara o preço de cada modelo nas lojas portuguesas.
        </p>
      </header>

      {/* Barra das letras: fica presa por baixo do cabeçalho do site (77px
          de altura) ao descer. No telemóvel desliza-se para o lado. */}
      <nav
        aria-label="Marcas por letra"
        className="sticky top-[76px] z-20 -mx-4 mt-9 flex gap-0.5 overflow-x-auto border-b border-t border-b-[#17232B]/10 border-t-[#17232B] bg-white/95 px-4 py-2 backdrop-blur-sm [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 sm:py-2.5 [&::-webkit-scrollbar]:hidden"
      >
        {groups.has('#') && (
          <a href="#letra-0" className={LETTER_LINK}>
            #
          </a>
        )}
        {ALPHABET.map((letter) =>
          groups.has(letter) ? (
            <a key={letter} href={`#letra-${letter}`} className={LETTER_LINK}>
              {letter}
            </a>
          ) : (
            <span
              key={letter}
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-sm font-medium text-[#17232B]/20 sm:h-[34px] sm:w-[34px]"
            >
              {letter}
            </span>
          )
        )}
      </nav>

      {letters.map((letter) => (
        <section
          key={letter}
          id={`letra-${letter === '#' ? '0' : letter}`}
          className="grid scroll-mt-[140px] grid-cols-1 border-b border-[#17232B]/10 py-7 sm:grid-cols-[140px_1fr] sm:py-9"
        >
          <h2 className="mb-3 font-display text-[40px] font-bold leading-[0.9] tracking-[-0.04em] text-[#123F3A] sm:mb-0 sm:text-[56px]">
            {letter}
          </h2>
          <ul className="columns-2 gap-x-5 sm:columns-3 sm:gap-x-8 lg:columns-4">
            {groups.get(letter)!.map((brand) => (
              <li key={brand.id} className="break-inside-avoid">
                <Link href={`/marcas/${brand.slug}`} className="group block py-[7px] text-[15px] leading-snug text-[#17232B]">
                  <span className="decoration-1 underline-offset-4 transition-colors group-hover:text-[#123F3A] group-hover:underline">
                    {brand.name}
                  </span>
                  <span className="ml-[7px] whitespace-nowrap text-xs tabular-nums text-[#5C6770]">{brand.count}</span>
                  <span
                    aria-hidden="true"
                    className="ml-1.5 hidden -translate-x-1 text-[13px] text-[#123F3A] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 sm:inline-block"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
