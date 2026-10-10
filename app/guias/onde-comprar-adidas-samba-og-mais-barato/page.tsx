// app/guias/onde-comprar-adidas-samba-og-mais-barato/page.tsx
//
// Guia "Onde comprar o adidas Samba OG mais barato" (ver lib/guides.ts).
// Tudo o que é preço, loja, portes, tamanhos e histórico vem da base de
// dados (os mesmos dados da página do ténis) - a página atualiza-se sozinha,
// de hora a hora. Nunca se inventa um preço: sem stock, a página diz isso.
import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'
import { formatPrice } from '@/lib/formatPrice'
import { formatDay } from '@/lib/formatDay'
import { getShippingCost } from '@/lib/savings'
import { buildOfferUrl } from '@/lib/offerUrl'
import { compareSizes } from '@/lib/sizeSort'
import { getFreshnessLabel } from '@/lib/freshness'
import { SITE_URL } from '@/lib/siteUrl'
import { getGuide } from '@/lib/guides'

export const revalidate = 3600 // ISR: 1 hora, como o resto do catálogo

const GUIDE_SLUG = 'onde-comprar-adidas-samba-og-mais-barato'
const PRODUCT_SLUG = 'adidas-samba'
const SIZE_GUIDE_SLUG = 'tabela-de-tamanhos-nike-adidas-new-balance'
const HISTORY_DAYS = 60

type StoreRow = {
  store: string
  price: number
  shipping: number | null // null = não dá para calcular (confirmar na loja)
  sizes: string[]
  url: string
  checkedLabel: string | null
}

async function getGuideData() {
  const { products } = await getProductsWithPrice()
  const product = products.find((p) => p.slug === PRODUCT_SLUG)
  if (!product) return { product: null, stores: [] as StoreRow[], history: null }

  // Agrupa por loja: preço mais baixo em stock, tamanhos em stock e a
  // verificação mais antiga entre as ofertas em stock (o "pior caso",
  // como na página do ténis).
  const grouped = new Map<
    string,
    { price: number; affiliate_url: string; template: string | null; fee: number | null; threshold: number | null; sizes: Set<string>; oldestChecked: string | null }
  >()
  for (const offer of product.product_offers ?? []) {
    if (!offer.in_stock || !offer.stores) continue
    const name = offer.stores.name
    const current = grouped.get(name)
    if (!current) {
      grouped.set(name, {
        price: offer.price,
        affiliate_url: offer.affiliate_url,
        template: offer.stores.affiliate_url_template,
        fee: offer.stores.shipping_base_fee,
        threshold: offer.stores.shipping_free_threshold,
        sizes: new Set([offer.size]),
        oldestChecked: offer.last_checked_at,
      })
      continue
    }
    current.sizes.add(offer.size)
    if (offer.price < current.price) {
      current.price = offer.price
      current.affiliate_url = offer.affiliate_url
    }
    if (offer.last_checked_at && (!current.oldestChecked || offer.last_checked_at < current.oldestChecked)) {
      current.oldestChecked = offer.last_checked_at
    }
  }

  const stores: StoreRow[] = Array.from(grouped.entries())
    .map(([store, g]) => ({
      store,
      price: g.price,
      shipping: getShippingCost({ store, price: g.price, shipping_base_fee: g.fee, shipping_free_threshold: g.threshold }),
      sizes: Array.from(g.sizes).sort(compareSizes),
      url: buildOfferUrl({ affiliate_url: g.affiliate_url, affiliate_url_template: g.template }),
      checkedLabel: g.oldestChecked ? getFreshnessLabel(g.oldestChecked) : null,
    }))
    .sort((a, b) => a.price - b.price)

  // Preço mais baixo registado nos últimos 60 dias (todas as lojas).
  let history: { minPrice: number; minDate: string; since: string; fullWindow: boolean } | null = null
  const offerIds = (product.product_offers ?? []).map((o) => o.id)
  if (offerIds.length > 0) {
    const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString()
    const { data } = await supabase
      .from('price_history')
      .select('price, recorded_at')
      .in('product_offer_id', offerIds)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })
    const rows = (data ?? []) as { price: number; recorded_at: string }[]
    if (rows.length > 0) {
      let min = rows[0]
      for (const row of rows) if (Number(row.price) < Number(min.price)) min = row
      // fullWindow: o histórico cobre mesmo os 60 dias (senão diz-se desde
      // quando há registos, para nunca exagerar).
      const fullWindow = Date.now() - new Date(rows[0].recorded_at).getTime() > (HISTORY_DAYS - 2) * 86_400_000
      history = { minPrice: Number(min.price), minDate: min.recorded_at, since: rows[0].recorded_at, fullWindow }
    }
  }

  return { product, stores, history }
}

export async function generateMetadata(): Promise<Metadata> {
  const { stores } = await getGuideData()
  const best = stores[0]
  const title = 'adidas Samba OG: onde comprar mais barato hoje | Parjusto'
  const description = best
    ? `Hoje, o adidas Samba OG está mais barato na ${best.store}, por ${formatPrice(best.price)}. Vê o preço em cada loja, os portes, os tamanhos disponíveis e o histórico de preços.`
    : 'Vê o preço do adidas Samba OG em cada loja, os portes, os tamanhos disponíveis e o histórico de preços.'
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

function shippingText(shipping: number | null): string {
  if (shipping == null) return 'Portes: confirmar na loja'
  if (shipping === 0) return 'Portes grátis'
  return `+ ${formatPrice(shipping)} de portes`
}

export default async function SambaOgGuidePage() {
  const guide = getGuide(GUIDE_SLUG)
  const { product, stores, history } = await getGuideData()
  const pageUrl = `${SITE_URL}/guias/${GUIDE_SLUG}`
  const best = stores[0] ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = product as any
  const variant = [p?.color ? String(p.color).toLowerCase() : null, p?.article_code ? `código ${p.article_code}` : null]
    .filter(Boolean)
    .join(', ')

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Parjusto', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Guias', item: `${SITE_URL}/guias` },
        { '@type': 'ListItem', position: 3, name: 'adidas Samba OG mais barato', item: pageUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide?.title ?? 'Onde comprar o adidas Samba OG mais barato',
      description: guide?.description,
      datePublished: guide?.publishedAt,
      mainEntityOfPage: pageUrl,
      author: { '@type': 'Organization', name: 'Parjusto', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'Parjusto', url: SITE_URL },
    },
  ]

  // "É boa altura para comprar?" - só com histórico real.
  let timingText: string | null = null
  if (best && history) {
    const sinceText = history.fullWindow
        ? `nos últimos ${HISTORY_DAYS} dias`
        : `desde ${formatDay(history.since)}, quando começámos a registar o histórico`
    timingText =
      best.price <= history.minPrice
        ? `O preço de hoje, ${formatPrice(best.price)}, é o mais baixo que registámos ${sinceText}.`
        : `O preço mais baixo que registámos ${sinceText} foi ${formatPrice(history.minPrice)}, a ${formatDay(history.minDate)}. Hoje está ${formatPrice(Math.round((best.price - history.minPrice) * 100) / 100)} acima disso. Se não tens pressa, podes criar um alerta de preço na página do ténis.`
  }

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
        <span className="text-[#17232B]">adidas Samba OG mais barato</span>
      </nav>

      <article className="mt-6">
        <header>
          <p className={LABEL}>Guia</p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-balance text-[#17232B] sm:text-[44px]">
            Onde comprar o adidas Samba OG mais barato
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#5C6770]">
            Comparámos o preço do adidas Samba OG{variant ? ` (${variant})` : ''} em todas as lojas que acompanhamos. Os
            preços e os tamanhos são verificados todos os dias e esta página atualiza-se sozinha.
          </p>
        </header>

        {product?.image_url && (
          <Link href={`/produto/${PRODUCT_SLUG}`} className="mt-8 block aspect-[4/3] w-full overflow-hidden bg-[#EEF0EF]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image_url} alt="adidas Samba OG" className="h-full w-full object-cover" />
          </Link>
        )}

        {best ? (
          <p className="mt-6 border-l-2 border-[#123F3A] bg-[#E8F2EF] px-4 py-3 text-sm text-[#17232B]">
            <span className="font-semibold">
              Hoje, o preço mais baixo é {formatPrice(best.price)}, na {best.store}.
            </span>{' '}
            {shippingText(best.shipping)}.
          </p>
        ) : (
          <p className="mt-6 border-l-2 border-[#17232B]/30 bg-[#F4F4F2] px-4 py-3 text-sm text-[#17232B]">
            Neste momento, nenhuma das lojas que acompanhamos tem o adidas Samba OG em stock. Cria um alerta na página do
            ténis para seres avisado quando voltar.
          </p>
        )}

        {stores.length > 0 && (
          <section className="mt-12">
            <h2 className={H2}>Preço em cada loja</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {stores.map((row, index) => (
                <li
                  key={row.store}
                  className="flex flex-col gap-4 rounded-none border border-[#17232B]/10 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#17232B]">
                      {row.store}
                      {index === 0 && stores.length > 1 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-[#E8F2EF] px-2 py-0.5 text-[11px] font-medium text-[#123F3A]">
                          Melhor preço
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-[#5C6770]">
                      {row.checkedLabel ? `Verificado ${row.checkedLabel} · ` : ''}
                      {shippingText(row.shipping)}
                    </p>
                    <p className="mt-2 text-xs text-[#5C6770]">
                      Tamanhos em stock: <span className="text-[#17232B]">{row.sizes.join(' · ')}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <span className="text-2xl font-bold tabular-nums text-[#17232B]">{formatPrice(row.price)}</span>
                    <a
                      href={row.url}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      data-offer-click="guia"
                      data-offer-product={PRODUCT_SLUG}
                      data-offer-store={row.store}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#123F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
                    >
                      Ver oferta
                    </a>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[#5C6770]">
              Portes estimados para Portugal continental. Confirma sempre o preço final na loja antes de comprar.
            </p>
          </section>
        )}

        {timingText && (
          <section className="mt-12">
            <h2 className={H2}>É boa altura para comprar?</h2>
            <p className={P}>{timingText}</p>
            <p className="mt-3 text-sm">
              <Link href={`/produto/${PRODUCT_SLUG}`} className="font-semibold text-[#17232B] underline underline-offset-4">
                Ver o gráfico de preços completo
              </Link>
            </p>
          </section>
        )}

        <section className="mt-12">
          <h2 className={H2}>Sobre o adidas Samba OG</h2>
          <p className={P}>
            Nasceu por volta de 1950 como sapato de futebol para pisos duros e hoje é um dos ténis de rua mais conhecidos
            da adidas, com a biqueira em T e a sola de borracha cor de mel. Na versão que acompanhamos:
          </p>
          <ul className="mt-4 space-y-2 text-base leading-relaxed text-[#17232B]/85">
            {p?.material && (
              <li>
                <strong className="text-[#17232B]">Material:</strong> {p.material}
              </li>
            )}
            {p?.sole_type && (
              <li>
                <strong className="text-[#17232B]">Sola:</strong> {p.sole_type}
              </li>
            )}
            {p?.weight && (
              <li>
                <strong className="text-[#17232B]">Peso:</strong> {p.weight}
              </li>
            )}
            {p?.color && (
              <li>
                <strong className="text-[#17232B]">Cor:</strong> {p.color}
              </li>
            )}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className={H2}>Que tamanho escolher?</h2>
          <p className={P}>
            A adidas usa terços de tamanho (40, 40 2/3, 41 1/3…) e algumas lojas escrevem-nos à sua maneira, por exemplo
            &quot;42.5&quot; em vez de &quot;42 2/3&quot;. Se costumas comprar Nike ou New Balance, vê a nossa{' '}
            <Link href={`/guias/${SIZE_GUIDE_SLUG}`} className="font-semibold text-[#17232B] underline underline-offset-4">
              tabela de tamanhos Nike vs adidas vs New Balance
            </Link>{' '}
            para encontrares o número certo. E se estás indeciso entre o Samba e o Gazelle, vê o{' '}
            <Link href="/guias/samba-vs-gazelle" className="font-semibold text-[#17232B] underline underline-offset-4">
              Samba OG vs Gazelle
            </Link>
            .
          </p>
        </section>

        <section className="mt-12 border-t border-[#17232B]/10 pt-8">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/produto/${PRODUCT_SLUG}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#17232B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f181e]"
            >
              Ver o adidas Samba OG no Parjusto
            </Link>
            <Link
              href="/marcas/adidas"
              className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-[#17232B]/20 px-5 text-sm font-semibold text-[#17232B] transition-colors hover:border-[#17232B]/50"
            >
              Outros adidas
            </Link>
          </div>
        </section>
      </article>
    </main>
  )
}
