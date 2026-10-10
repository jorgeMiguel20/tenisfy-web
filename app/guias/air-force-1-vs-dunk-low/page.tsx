// app/guias/air-force-1-vs-dunk-low/page.tsx
//
// Guia "Air Force 1 vs Dunk Low" (ver lib/guides.ts). O texto é fixo, mas os
// preços, as lojas e a ficha de cada ténis vêm sempre da base de dados (os
// mesmos do resto do site) - a página atualiza-se sozinha, de hora a hora.
// Regra de sempre: só factos verificáveis, nada de preços ou poupanças
// inventados. Se um dos ténis ficar sem stock, a página diz isso mesmo.
import type { Metadata } from 'next'
import Link from 'next/link'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'
import { formatPrice } from '@/lib/formatPrice'
import { SITE_URL } from '@/lib/siteUrl'
import { getGuide } from '@/lib/guides'
import { isOfficialStore } from '@/lib/savings'
import type { ProductWithPrice } from '@/lib/types'

export const revalidate = 3600 // ISR: 1 hora, como o resto do catálogo

const GUIDE_SLUG = 'air-force-1-vs-dunk-low'
const AF1_SLUG = 'nike-air-force-1'
const DUNK_SLUG = 'nike-dunk-low'

type ShoeSummary = {
  slug: string
  name: string
  imageUrl: string | null
  lowestPrice: number | null
  cheapestStore: string | null
  officialPrice: number | null
  storeCount: number
  material: string | null
  sole: string | null
  fit: string | null
  color: string | null
  articleCode: string | null
}

function summarize(product: ProductWithPrice | undefined, slug: string, fallbackName: string): ShoeSummary {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = product as any
  const offers = (product?.product_offers ?? []).filter((o) => o.in_stock)
  let cheapest: (typeof offers)[number] | null = null
  for (const offer of offers) {
    if (!cheapest || offer.price < cheapest.price) cheapest = offer
  }
  const official = offers
    .filter((o) => isOfficialStore(o.stores?.name ?? '', product?.brands?.name))
    .map((o) => o.price)

  return {
    slug,
    name: product ? `${product.brands?.name ?? ''} ${product.model_name}`.trim() : fallbackName,
    imageUrl: product?.image_url ?? null,
    lowestPrice: product?.lowest_price ?? null,
    cheapestStore: cheapest?.stores?.name ?? null,
    officialPrice: official.length > 0 ? Math.min(...official) : null,
    storeCount: product?.store_count ?? 0,
    material: p?.material ?? null,
    sole: p?.sole_type ?? null,
    fit: p?.fit ?? null,
    color: p?.color ?? null,
    articleCode: p?.article_code ?? null,
  }
}

async function getGuideData() {
  const { products } = await getProductsWithPrice()
  const af1 = summarize(products.find((p) => p.slug === AF1_SLUG), AF1_SLUG, "Nike Air Force 1 '07")
  const dunk = summarize(products.find((p) => p.slug === DUNK_SLUG), DUNK_SLUG, 'Nike Dunk Low')
  return { af1, dunk }
}

function priceText(shoe: ShoeSummary): string {
  return shoe.lowestPrice != null ? `desde ${formatPrice(shoe.lowestPrice)}` : 'sem stock de momento'
}

export async function generateMetadata(): Promise<Metadata> {
  const { af1, dunk } = await getGuideData()
  const title = 'Nike Air Force 1 vs Dunk Low: diferenças e preços | Parjusto'
  const description = `Air Force 1 ou Dunk Low? Vê as diferenças de sola, amortecimento e estilo, e o preço de hoje nas lojas portuguesas: Air Force 1 ${priceText(af1)}, Dunk Low ${priceText(dunk)}.`
  return {
    title,
    description,
    alternates: { canonical: `/guias/${GUIDE_SLUG}` },
    openGraph: { title, description, type: 'article' },
  }
}

const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'
const H2 = 'font-display text-[24px] font-bold leading-[1.15] tracking-[-0.01em] text-[#17232B] sm:text-[28px]'
const P = 'mt-4 text-base leading-relaxed text-[#17232B]/85'

function ShoeHeader({ shoe }: { shoe: ShoeSummary }) {
  return (
    <Link href={`/produto/${shoe.slug}`} className="group block">
      <div className="aspect-square w-full overflow-hidden bg-[#EEF0EF]">
        {shoe.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shoe.imageUrl}
            alt={shoe.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <p className="mt-3 font-semibold text-[#17232B]">{shoe.name}</p>
      <p className="text-sm text-[#5C6770]">
        {shoe.lowestPrice != null ? (
          <>
            desde <span className="font-semibold tabular-nums text-[#17232B]">{formatPrice(shoe.lowestPrice)}</span>
            {shoe.cheapestStore ? ` na ${shoe.cheapestStore}` : ''}
          </>
        ) : (
          'sem stock nas lojas que acompanhamos'
        )}
      </p>
    </Link>
  )
}

export default async function AirForce1VsDunkLowPage() {
  const guide = getGuide(GUIDE_SLUG)
  const { af1, dunk } = await getGuideData()
  const pageUrl = `${SITE_URL}/guias/${GUIDE_SLUG}`

  // Diferença de preço de hoje (só quando os dois têm stock).
  const bothPriced = af1.lowestPrice != null && dunk.lowestPrice != null
  const difference = bothPriced ? Math.round(Math.abs((af1.lowestPrice as number) - (dunk.lowestPrice as number)) * 100) / 100 : null
  const cheaper = bothPriced ? ((dunk.lowestPrice as number) < (af1.lowestPrice as number) ? dunk : af1) : null

  const rows: { label: string; a: string; b: string }[] = [
    { label: 'Preço mais baixo hoje', a: af1.lowestPrice != null ? formatPrice(af1.lowestPrice) : 'Sem stock', b: dunk.lowestPrice != null ? formatPrice(dunk.lowestPrice) : 'Sem stock' },
    { label: 'Preço na Nike', a: af1.officialPrice != null ? formatPrice(af1.officialPrice) : '—', b: dunk.officialPrice != null ? formatPrice(dunk.officialPrice) : '—' },
    { label: 'Lojas com stock', a: String(af1.storeCount), b: String(dunk.storeCount) },
    { label: 'Material', a: af1.material ?? '—', b: dunk.material ?? '—' },
    { label: 'Sola', a: af1.sole ?? '—', b: dunk.sole ?? '—' },
    { label: 'Cor (versão no Parjusto)', a: af1.color ?? '—', b: dunk.color ?? '—' },
    { label: 'Código do artigo', a: af1.articleCode ?? '—', b: dunk.articleCode ?? '—' },
  ]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Parjusto', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Guias', item: `${SITE_URL}/guias` },
        { '@type': 'ListItem', position: 3, name: 'Air Force 1 vs Dunk Low', item: pageUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide?.title ?? 'Air Force 1 vs Dunk Low: qual escolher?',
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
        <span className="text-[#17232B]">Air Force 1 vs Dunk Low</span>
      </nav>

      <article className="mt-6">
        <header>
          <p className={LABEL}>Guia</p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-balance text-[#17232B] sm:text-[44px]">
            Air Force 1 vs Dunk Low: qual escolher?
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#5C6770]">
            Os dois nasceram nos campos de basquetebol nos anos 80 e são hoje dos Nike mais usados no dia a dia. Juntámos
            as diferenças que importam na hora de comprar — e o preço de hoje de cada um nas lojas portuguesas.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6">
          <ShoeHeader shoe={af1} />
          <ShoeHeader shoe={dunk} />
        </div>

        {cheaper && difference != null && difference >= 1 && (
          <p className="mt-6 border-l-2 border-[#123F3A] bg-[#E8F2EF] px-4 py-3 text-sm text-[#17232B]">
            <span className="font-semibold">Hoje, o {cheaper.name} está {formatPrice(difference)} mais barato.</span>{' '}
            Os preços são verificados todos os dias e esta página atualiza-se sozinha.
          </p>
        )}

        <section className="mt-12">
          <h2 className={H2}>Lado a lado</h2>
          <div className="mt-5">
            <table className="w-full table-fixed border-collapse text-left text-[13px] sm:text-sm">
              <thead>
                <tr className="border-b border-[#17232B]/15">
                  <th className="w-[30%] py-3 pr-4 font-medium text-[#5C6770]" />
                  <th className="py-3 pr-4 font-semibold text-[#17232B]">Air Force 1</th>
                  <th className="py-3 font-semibold text-[#17232B]">Dunk Low</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-[#17232B]/10 align-top">
                    <th scope="row" className="py-3 pr-4 font-medium text-[#5C6770]">
                      {row.label}
                    </th>
                    <td className="py-3 pr-4 text-[#17232B]">{row.a}</td>
                    <td className="py-3 text-[#17232B]">{row.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className={H2}>De onde vêm</h2>
          <p className={P}>
            O <strong>Air Force 1</strong>{' '}foi lançado pela Nike em 1982 como ténis de basquetebol e foi um dos primeiros a
            usar a almofada Nike Air na sola. Com o tempo passou dos pavilhões para a rua, e a versão toda branca tornou-se um
            dos ténis mais conhecidos do mundo.
          </p>
          <p className={P}>
            O <strong>Dunk</strong>{' '}chegou em 1985, também como ténis de basquetebol, pensado para equipas universitárias
            americanas e com as cores de cada equipa. Mais tarde foi adotado pelo skate e hoje é conhecido pelas combinações
            de duas cores.
          </p>
        </section>

        <section className="mt-12">
          <h2 className={H2}>As diferenças que se veem</h2>
          <ul className="mt-4 space-y-3 text-base leading-relaxed text-[#17232B]/85">
            <li>
              <strong className="text-[#17232B]">Sola:</strong>{' '}a do Air Force 1 é mais alta e robusta, com &quot;AIR&quot;
              escrito na lateral. A do Dunk Low é mais baixa e plana, o que lhe dá um perfil mais fino.
            </li>
            <li>
              <strong className="text-[#17232B]">Amortecimento:</strong>{' '}nas versões que acompanhamos, o Air Force 1 tem
              amortecimento Nike Air na sola; o Dunk Low tem sola intermédia em espuma. Vê a ficha de cada um na tabela acima.
            </li>
            <li>
              <strong className="text-[#17232B]">Cores:</strong>{' '}o Air Force 1 é sobretudo conhecido todo branco, como a versão
              que acompanhamos. O Dunk Low é mais conhecido pelas combinações de duas cores, como o branco e preto da versão
              que acompanhamos.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className={H2}>Tamanhos</h2>
          <p className={P}>
            Os dois são Nike e usam a mesma tabela de tamanhos, com meios números: 40, 40.5, 41, 42… Se quiseres comparar com
            outras marcas, vê a nossa{' '}
            <Link href="/guias/tabela-de-tamanhos-nike-adidas-new-balance" className="font-semibold text-[#17232B] underline underline-offset-4">
              tabela de tamanhos Nike vs adidas vs New Balance
            </Link>
            .
          </p>
          <p className={P}>
            Se estiveres entre dois tamanhos, o mais seguro é experimentar numa loja física ou confirmar a política de
            devoluções antes de comprar. No Parjusto podes ver, em cada loja, que tamanhos ainda têm stock e criar um
            alerta para o teu tamanho.
          </p>
        </section>

        <section className="mt-12">
          <h2 className={H2}>Qual escolher?</h2>
          <ul className="mt-4 space-y-3 text-base leading-relaxed text-[#17232B]/85">
            <li>
              <strong className="text-[#17232B]">Escolhe o Air Force 1</strong>{' '}se queres uma sola mais alta, amortecimento
              Nike Air e o branco total que combina com quase tudo
              {cheaper && cheaper.slug === AF1_SLUG && difference != null && difference >= 1
                ? `. E, hoje, está ${formatPrice(difference)} mais barato.`
                : '.'}
            </li>
            <li>
              <strong className="text-[#17232B]">Escolhe o Dunk Low</strong>{' '}se preferes um perfil mais fino e baixo e o
              contraste de duas cores
              {cheaper && cheaper.slug === DUNK_SLUG && difference != null && difference >= 1
                ? `. E, hoje, está ${formatPrice(difference)} mais barato.`
                : '.'}
            </li>
          </ul>
        </section>

        <section className="mt-12 border-t border-[#17232B]/10 pt-8">
          <h2 className={H2}>Compara os preços</h2>
          <p className="mt-3 text-sm text-[#5C6770]">
            Preços e stock verificados todos os dias nas lojas portuguesas. Confirma sempre na loja antes de comprar.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/produto/${AF1_SLUG}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#17232B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f181e]"
            >
              Ver preços do Air Force 1
            </Link>
            <Link
              href={`/produto/${DUNK_SLUG}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#17232B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f181e]"
            >
              Ver preços do Dunk Low
            </Link>
            <Link
              href={`/comparar?produtos=${AF1_SLUG},${DUNK_SLUG}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-[#17232B]/20 px-5 text-sm font-semibold text-[#17232B] transition-colors hover:border-[#17232B]/50"
            >
              Comparar lado a lado
            </Link>
          </div>
        </section>
      </article>
    </main>
  )
}
