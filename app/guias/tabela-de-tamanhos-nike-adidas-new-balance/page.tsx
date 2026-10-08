// app/guias/tabela-de-tamanhos-nike-adidas-new-balance/page.tsx
//
// Guia "Tabela de tamanhos: Nike vs adidas vs New Balance" (ver
// lib/guides.ts). Os números vêm das tabelas oficiais de calçado de homem
// de cada marca, consultadas a 9 de outubro de 2026 (links no fim da
// página). Se uma marca mudar a sua tabela, é aqui que se atualiza.
import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/siteUrl'
import { getGuide } from '@/lib/guides'

const GUIDE_SLUG = 'tabela-de-tamanhos-nike-adidas-new-balance'

export const metadata: Metadata = {
  title: 'Tabela de tamanhos Nike, adidas e New Balance: equivalências EU, US e UK | Parjusto',
  description:
    'O mesmo pé tem números diferentes em cada marca. Vê as equivalências entre os tamanhos EU, US e UK da Nike, adidas e New Balance, das tabelas oficiais de cada marca.',
  alternates: { canonical: `/guias/${GUIDE_SLUG}` },
  openGraph: {
    title: 'Tabela de tamanhos: Nike vs adidas vs New Balance',
    description: 'As equivalências entre os tamanhos da Nike, adidas e New Balance, das tabelas oficiais de cada marca.',
    type: 'article',
  },
}

// Calçado de homem / unissexo, por tamanho US de homem.
// Fontes: nike.com (size-fit/mens-footwear), adidas.pt (help/size_charts/
// men-shoes) e newbalance.pt (size-guide).
type SizeRow = {
  us: string
  nike: { eu: string; uk: string; cm: string }
  adidas: { eu: string; uk: string; cm: string }
  nb: { eu: string; uk: string; cm: string }
}

const SIZES: SizeRow[] = [
  { us: '6', nike: { eu: '38.5', uk: '5.5', cm: '23,7' }, adidas: { eu: '38 2/3', uk: '5.5', cm: '23,8' }, nb: { eu: '38.5', uk: '5.5', cm: '24' } },
  { us: '6.5', nike: { eu: '39', uk: '6', cm: '24,1' }, adidas: { eu: '39 1/3', uk: '6', cm: '24,2' }, nb: { eu: '39.5', uk: '6', cm: '24,5' } },
  { us: '7', nike: { eu: '40', uk: '6', cm: '24,5' }, adidas: { eu: '40', uk: '6.5', cm: '24,6' }, nb: { eu: '40', uk: '6.5', cm: '25' } },
  { us: '7.5', nike: { eu: '40.5', uk: '6.5', cm: '25' }, adidas: { eu: '40 2/3', uk: '7', cm: '25' }, nb: { eu: '40.5', uk: '7', cm: '25,5' } },
  { us: '8', nike: { eu: '41', uk: '7', cm: '25,4' }, adidas: { eu: '41 1/3', uk: '7.5', cm: '25,5' }, nb: { eu: '41.5', uk: '7.5', cm: '26' } },
  { us: '8.5', nike: { eu: '42', uk: '7.5', cm: '25,8' }, adidas: { eu: '42', uk: '8', cm: '25,9' }, nb: { eu: '42', uk: '8', cm: '26,5' } },
  { us: '9', nike: { eu: '42.5', uk: '8', cm: '26,2' }, adidas: { eu: '42 2/3', uk: '8.5', cm: '26,3' }, nb: { eu: '42.5', uk: '8.5', cm: '27' } },
  { us: '9.5', nike: { eu: '43', uk: '8.5', cm: '26,7' }, adidas: { eu: '43 1/3', uk: '9', cm: '26,7' }, nb: { eu: '43', uk: '9', cm: '27,5' } },
  { us: '10', nike: { eu: '44', uk: '9', cm: '27,1' }, adidas: { eu: '44', uk: '9.5', cm: '27,1' }, nb: { eu: '44', uk: '9.5', cm: '28' } },
  { us: '10.5', nike: { eu: '44.5', uk: '9.5', cm: '27,5' }, adidas: { eu: '44 2/3', uk: '10', cm: '27,6' }, nb: { eu: '44.5', uk: '10', cm: '28,5' } },
  { us: '11', nike: { eu: '45', uk: '10', cm: '27,9' }, adidas: { eu: '45 1/3', uk: '10.5', cm: '28' }, nb: { eu: '45', uk: '10.5', cm: '29' } },
  { us: '11.5', nike: { eu: '45.5', uk: '10.5', cm: '28,3' }, adidas: { eu: '46', uk: '11', cm: '28,4' }, nb: { eu: '45.5', uk: '11', cm: '29,5' } },
  { us: '12', nike: { eu: '46', uk: '11', cm: '28,8' }, adidas: { eu: '46 2/3', uk: '11.5', cm: '28,8' }, nb: { eu: '46.5', uk: '11.5', cm: '30' } },
  { us: '12.5', nike: { eu: '47', uk: '11.5', cm: '29,2' }, adidas: { eu: '47 1/3', uk: '12', cm: '29,3' }, nb: { eu: '47', uk: '12', cm: '30,5' } },
  { us: '13', nike: { eu: '47.5', uk: '12', cm: '29,6' }, adidas: { eu: '48', uk: '12.5', cm: '29,7' }, nb: { eu: '47.5', uk: '12.5', cm: '31' } },
]

const SOURCES = [
  { name: 'Nike: tabela de calçado de homem', url: 'https://www.nike.com/ie/size-fit/mens-footwear' },
  { name: 'adidas: guia de tamanhos de calçado de homem', url: 'https://www.adidas.pt/help/size_charts/men-shoes' },
  { name: 'New Balance: guia de tamanhos e larguras', url: 'https://www.newbalance.pt/pt/size-guide.html' },
]

const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'
const H2 = 'font-display text-[24px] font-bold leading-[1.15] tracking-[-0.01em] text-[#17232B] sm:text-[28px]'
const P = 'mt-4 text-base leading-relaxed text-[#17232B]/85'
const TH = 'py-3 pr-3 font-semibold text-[#17232B]'
const TD = 'py-2.5 pr-3 tabular-nums text-[#17232B]'

function SizeTable({ field, caption }: { field: 'eu' | 'uk' | 'cm'; caption: string }) {
  return (
    <table className="mt-5 w-full table-fixed border-collapse text-left text-[13px] sm:text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-[#17232B]/15">
          <th scope="col" className="w-[22%] py-3 pr-3 font-medium text-[#5C6770]">
            US homem
          </th>
          <th scope="col" className={TH}>Nike</th>
          <th scope="col" className={TH}>adidas</th>
          <th scope="col" className={TH}>New Balance</th>
        </tr>
      </thead>
      <tbody>
        {SIZES.map((row) => (
          <tr key={row.us} className="border-b border-[#17232B]/10">
            <th scope="row" className="py-2.5 pr-3 font-medium tabular-nums text-[#5C6770]">
              {row.us}
            </th>
            <td className={TD}>{row.nike[field]}</td>
            <td className={TD}>{row.adidas[field]}</td>
            <td className={TD}>{row.nb[field]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function TabelaTamanhosPage() {
  const guide = getGuide(GUIDE_SLUG)
  const pageUrl = `${SITE_URL}/guias/${GUIDE_SLUG}`

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Parjusto', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Guias', item: `${SITE_URL}/guias` },
        { '@type': 'ListItem', position: 3, name: 'Tabela de tamanhos', item: pageUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide?.title ?? 'Tabela de tamanhos: Nike vs adidas vs New Balance',
      description: guide?.description,
      datePublished: guide?.publishedAt,
      mainEntityOfPage: pageUrl,
      author: { '@type': 'Organization', name: 'Parjusto', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'Parjusto', url: SITE_URL },
    },
  ]

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-20 pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-[13px] text-[#5C6770]">
        <Link href="/" className="transition-colors hover:text-[#17232B]">
          Parjusto
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/guias" className="transition-colors hover:text-[#17232B]">
          Guias
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#17232B]">Tabela de tamanhos</span>
      </nav>

      <article className="mt-6">
        <header>
          <p className={LABEL}>Guia</p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-balance text-[#17232B] sm:text-[44px]">
            Tabela de tamanhos: Nike vs adidas vs New Balance
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#5C6770]">
            O mesmo tamanho americano, US 9, é 42.5 na Nike, 42 2/3 na adidas e 42.5 na New Balance. Juntámos as tabelas
            oficiais das três marcas numa só, para saberes que número escolher em cada uma.
          </p>
        </header>

        <section className="mt-10">
          <h2 className={H2}>Como usar esta tabela</h2>
          <p className={P}>
            As três marcas usam o mesmo tamanho americano (US) como referência, mas convertem-no para tamanho europeu (EU) de
            formas diferentes. Por isso, a forma mais segura de comparar é partir do teu tamanho US: procura-o na primeira
            coluna e lê o número EU de cada marca na mesma linha.
          </p>
          <p className={P}>
            Exemplo: se calças <strong className="text-[#17232B]">US 9</strong>, és 42.5 na Nike, 42 2/3 na adidas e 42.5 na
            New Balance.
          </p>
        </section>

        <section className="mt-12">
          <h2 className={H2}>Tamanho europeu (EU) em cada marca</h2>
          <SizeTable field="eu" caption="Tamanho europeu (EU) da Nike, adidas e New Balance para cada tamanho US de homem" />
        </section>

        <section className="mt-12">
          <h2 className={H2}>Os terços da adidas</h2>
          <p className={P}>
            A adidas usa terços de tamanho (40, 40 2/3, 41 1/3, 42…), enquanto a Nike e a New Balance usam meios (40, 40.5,
            41…). Algumas lojas escrevem os tamanhos da adidas à sua maneira, por exemplo &quot;42.5&quot; em vez de &quot;42
            2/3&quot;. No Parjusto tratamos estes dois como o mesmo tamanho, nos filtros e nos alertas de preço.
          </p>
        </section>

        <section className="mt-12">
          <h2 className={H2}>Tamanho britânico (UK) em cada marca</h2>
          <p className={P}>
            Atenção: o mesmo tamanho US nem sempre corresponde ao mesmo UK. Na Nike, a partir do US 7, o UK é 1 número abaixo
            do US; na adidas e na New Balance, é meio número abaixo.
          </p>
          <SizeTable field="uk" caption="Tamanho britânico (UK) da Nike, adidas e New Balance para cada tamanho US de homem" />
        </section>

        <section className="mt-12">
          <h2 className={H2}>Medir o pé</h2>
          <p className={P}>
            Se não sabes o teu tamanho US, mede o pé: do calcanhar à ponta do dedo mais comprido, de pé, de preferência ao
            fim do dia (os pés incham um pouco ao longo do dia). Depois procura na tabela o comprimento mais próximo,
            na coluna da marca que queres comprar.
          </p>
          <SizeTable field="cm" caption="Comprimento do pé em centímetros segundo a tabela de cada marca" />
          <p className="mt-3 text-sm text-[#5C6770]">
            Comprimento em centímetros indicado por cada marca. Cada uma mede à sua maneira, por isso compara sempre dentro da
            coluna da marca que vais comprar.
          </p>
        </section>

        <section className="mt-12">
          <h2 className={H2}>Se estiveres entre dois tamanhos</h2>
          <ul className="mt-4 space-y-3 text-base leading-relaxed text-[#17232B]/85">
            <li>
              <strong className="text-[#17232B]">New Balance:</strong> a marca aconselha escolher o tamanho maior.
            </li>
            <li>
              <strong className="text-[#17232B]">adidas:</strong> um tamanho abaixo se preferes um ajuste mais justo, um acima
              se preferes mais folga.
            </li>
            <li>
              <strong className="text-[#17232B]">Em qualquer marca:</strong> confirma a política de trocas da loja antes de
              comprar. No Parjusto vês, em cada loja, que tamanhos ainda têm stock e podes criar um alerta para o teu
              tamanho.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className={H2}>E para mulher?</h2>
          <p className={P}>
            As tabelas acima são de calçado de homem e unissexo, que inclui a maioria dos ténis do Parjusto. Nos modelos de
            mulher, o tamanho US é diferente: na Nike e na New Balance soma-se 1,5 ao tamanho US de homem, e na adidas
            soma-se 1. A New Balance tem ainda uma tabela de mulher com números EU próprios, por isso confirma sempre na
            tabela da marca.
          </p>
        </section>

        <section className="mt-12 border-t border-[#17232B]/10 pt-8">
          <h2 className={H2}>Já sabes o teu tamanho?</h2>
          <p className="mt-3 text-sm text-[#5C6770]">
            Vê que lojas têm o teu tamanho em stock e onde está mais barato.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/catalogo"
              className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#17232B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f181e]"
            >
              Ver o catálogo
            </Link>
            <Link
              href="/marcas"
              className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-[#17232B]/20 px-5 text-sm font-semibold text-[#17232B] transition-colors hover:border-[#17232B]/50"
            >
              Ver por marca
            </Link>
          </div>

          <p className="mt-10 text-xs leading-relaxed text-[#5C6770]">
            Fontes: tabelas oficiais de calçado de homem de cada marca, consultadas em outubro de 2026 —{' '}
            {SOURCES.map((source, index) => (
              <span key={source.url}>
                <a href={source.url} target="_blank" rel="nofollow noopener" className="underline underline-offset-2 hover:text-[#17232B]">
                  {source.name}
                </a>
                {index < SOURCES.length - 1 ? '; ' : '.'}
              </span>
            ))}{' '}
            Alguns modelos podem ter um ajuste diferente do habitual da marca.
          </p>
        </section>
      </article>
    </main>
  )
}
