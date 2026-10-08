// app/guias/page.tsx
//
// Lista dos guias do Parjusto (ver lib/guides.ts).
import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDES } from '@/lib/guides'
import { SITE_URL } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Guias de ténis: comparações, tamanhos e preços | Parjusto',
  description:
    'Guias para escolher ténis com os preços reais das lojas portuguesas: comparações entre modelos, tamanhos e onde comprar mais barato.',
  alternates: { canonical: '/guias' },
}

const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'

export default function GuiasPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Parjusto', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guias', item: `${SITE_URL}/guias` },
    ],
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-20 pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-[13px] text-[#5C6770]">
        <Link href="/" className="transition-colors hover:text-[#17232B]">
          Parjusto
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#17232B]">Guias</span>
      </nav>

      <header className="mt-6 max-w-2xl">
        <p className={LABEL}>Guias</p>
        <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B] sm:text-[44px]">
          Guias para escolher ténis
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#5C6770]">
          Comparações entre modelos, tamanhos e onde comprar mais barato, sempre com os preços reais das lojas
          portuguesas, verificados todos os dias.
        </p>
      </header>

      <ul className="mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guias/${guide.slug}`}
              className="block h-full rounded-none border border-[#17232B]/10 p-5 transition-colors hover:border-[#17232B]/30"
            >
              <h2 className="text-lg font-semibold text-[#17232B]">{guide.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5C6770]">{guide.description}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-[#17232B]">Ler guia →</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
