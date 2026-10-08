// app/guias/samba-vs-gazelle/page.tsx
//
// Guia "Samba OG vs Gazelle" (ver lib/guides.ts). O texto é fixo, mas os
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

const GUIDE_SLUG = 'samba-vs-gazelle'
const SAMBA_SLUG = 'adidas-samba'
const GAZELLE_SLUG = 'adidas-gazelle'

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
  const samba = summarize(products.find((p) => p.slug === SAMBA_SLUG), SAMBA_SLUG, 'adidas Samba OG')
  const gazelle = summarize(products.find((p) => p.slug === GAZELLE_SLUG), GAZELLE_SLUG, 'adidas Gazelle')
  return { samba, gazelle }
}

function priceText(shoe: ShoeSummary): string {
  return shoe.lowestPrice != null ? `desde ${formatPrice(shoe.lowestPrice)}` : 'sem stock de momento'
}

export async function generateMetadata(): Promise<Metadata> {
  const { samba, gazelle } = await getGuideData()
  const title = 'adidas Samba vs Gazelle: diferenças, tamanhos e preços | Parjusto'
  const description = `Samba OG ou Gazelle? Vê as diferenças de material, sola e tamanhos, e o preço de hoje nas lojas portuguesas: Samba OG ${priceText(samba)}, Gazelle ${priceText(gazelle)}.`
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

export default async function SambaVsGazellePage() {
  const guide = getGuide(GUIDE_SLUG)
  const { samba, gazelle } = await getGuideData()
  const pageUrl = `${SITE_URL}/guias/${GUIDE_SLUG}`

  // Diferença de preço de hoje (só quando os dois têm stock).
  const bothPriced = samba.lowestPrice != null && gazelle.lowestPrice != null
  const difference = bothPriced ? Math.round(Math.abs((samba.lowestPrice as number) - (gazelle.lowestPrice as number)) * 100) / 100 : null
  const cheaper = bothPriced ? ((gazelle.lowestPrice as number) < (samba.lowestPrice as number) ? gazelle : samba) : null

  const rows: { label: string; samba: string; gazelle: string }[] = [
    { label: 'Preço mais baixo hoje', samba: samba.lowestPrice != null ? formatPrice(samba.lowestPrice) : 'Sem stock', gazelle: gazelle.lowestPrice != null ? formatPrice(gazelle.lowestPrice) : 'Sem stock' },
    { label: 'Preço na adidas', samba: samba.officialPrice != null ? formatPrice(samba.officialPrice) : '—', gazelle: gazelle.officialPrice != null ? formatPrice(gazelle.officialPrice) : '—' },
    { label: 'Lojas com stock', samba: String(samba.storeCount), gazelle: String(gazelle.storeCount) },
    { label: 'Material', samba: samba.material ?? '—', gazelle: gazelle.material ?? '—' },
    { label: 'Sola', samba: samba.sole ?? '—', gazelle: gazelle.sole ?? '—' },
    { label: 'Ajuste', samba: samba.fit ?? '—', gazelle: gazelle.fit ?? '—' },
    { label: 'Cor (versão no Parjusto)', samba: samba.color ?? '—', gazelle: gazelle.color ?? '—' },
    { label: 'Código do artigo', samba: samba.articleCode ?? '—', gazelle: gazelle.articleCode ?? '—' },
  ]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Parjusto', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Guias', item: `${SITE_URL}/guias` },
        { '@type': 'ListItem', position: 3, name: 'Samba OG vs Gazelle', item: pageUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide?.title ?? 'Samba OG vs Gazelle: qual escolher?',
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
        <span className="text-[#17232B]">Samba OG vs Gazelle</span>
      </nav>

      <article className="mt-6">
        <header>
          <p className={LABEL}>Guia</p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-balance text-[#17232B] sm:text-[44px]">
            Samba OG vs Gazelle: qual escolher?
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#5C6770]">
            São dois dos clássicos da adidas mais vistos na rua, e muita gente fica indecisa entre eles. Juntámos as
            diferenças que importam na hora de comprar — e o preço de hoje de cada um nas lojas portuguesas.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6">
          <ShoeHeader shoe={samba} />
          <ShoeHeader shoe={gazelle} />
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
                  <th className="py-3 pr-4 font-semibold text-[#17232B]">Samba OG</th>
                  <th className="py-3 font-semibold text-[#17232B]">Gazelle</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-[#17232B]/10 align-top">
                    <th scope="row" className="py-3 pr-4 font-medium text-[#5C6770]">
                      {row.label}
                    </th>
                    <td className="py-3 pr-4 text-[#17232B]">{row.samba}</td>
                    <td className="py-3 text-[#17232B]">{row.gazelle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className={H2}>De onde vêm</h2>
          <p className={P}>
            O <strong>Samba</strong>{' '}nasceu por volta de 1950 como sapato de futebol, pensado para treinar em pisos duros e
            gelados. Com o tempo saiu dos pavilhões e tornou-se um dos ténis de rua mais reconhecíveis da adidas.
          </p>
          <p className={P}>
            O <strong>Gazelle</strong>{' '}chegou em 1966 como ténis de treino e ficou conhecido pelo topo em camurça e pela enorme
            variedade de cores. É o mais &quot;simples&quot; dos dois: linhas limpas, sem a biqueira sobreposta do Samba.
          </p>
        </section>

        <section className="mt-12">
          <h2 className={H2}>As diferenças que se veem</h2>
          <ul className="mt-4 space-y-3 text-base leading-relaxed text-[#17232B]/85">
            <li>
              <strong className="text-[#17232B]">Biqueira:</strong> o Samba OG tem uma peça de camurça sobreposta na frente,
              em forma de T. É o detalhe que o identifica logo. O Gazelle tem a frente lisa, no mesmo material do resto.
            </li>
            <li>
              <strong className="text-[#17232B]">Material:</strong> na versão que acompanhamos, o Samba OG é em pele com a
              biqueira em camurça; o Gazelle é em nubuck, um couro com toque aveludado parecido com camurça.
            </li>
            <li>
              <strong className="text-[#17232B]">Sola:</strong> o Samba OG desta versão tem sola de borracha natural, cor de
              mel, herança dos sapatos de futebol de interior. Vê a sola de cada um na tabela acima.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className={H2}>Tamanhos</h2>
          <p className={P}>
            Os dois são adidas e usam a mesma tabela de tamanhos, com terços: 40, 40 2/3, 41 1/3, 42… Se num site vires
            &quot;42.5&quot; e noutro &quot;42 2/3&quot;, é praticamente o mesmo tamanho. Na ficha de cada modelo, ambos aparecem com
            ajuste normal.
          </p>
          <p className={P}>
            Se estiveres entre dois tamanhos, o mais seguro é experimentar numa loja física ou confirmar a política de
            devoluções antes de comprar. No Parjusto podes ver, em cada loja, que tamanhos ainda têm stock e criar um
            alerta para o teu tamanho, para seres avisado quando voltar ou quando o preço descer.
          </p>
        </section>

        <section className="mt-12">
          <h2 className={H2}>Qual escolher?</h2>
          <ul className="mt-4 space-y-3 text-base leading-relaxed text-[#17232B]/85">
            <li>
              <strong className="text-[#17232B]">Escolhe o Samba OG</strong> se queres o modelo mais reconhecível dos dois,
              com a biqueira em T e a sola cor de mel.
            </li>
            <li>
              <strong className="text-[#17232B]">Escolhe o Gazelle</strong> se preferes um visual mais limpo, em nubuck, com
              muitas cores à escolha
              {cheaper && cheaper.slug === GAZELLE_SLUG && difference != null && difference >= 1
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
              href={`/produto/${SAMBA_SLUG}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#17232B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f181e]"
            >
              Ver preços do Samba OG
            </Link>
            <Link
              href={`/produto/${GAZELLE_SLUG}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#17232B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f181e]"
            >
              Ver preços do Gazelle
            </Link>
            <Link
              href={`/comparar?produtos=${SAMBA_SLUG},${GAZELLE_SLUG}`}
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
