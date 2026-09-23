// app/comparar/page.tsx
import { Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Metadata } from 'next'
import ComparePicker from '@/components/ComparePicker'
import ProductGallery from '@/components/ProductGallery'
import RemoveCompareButton from '@/components/RemoveCompareButton'
import CompareSelectionSync from '@/components/CompareSelectionSync'
import CompareRestoreFromStorage from '@/components/CompareRestoreFromStorage'
import {
  CompareDiffProvider,
  CompareDiffToggle,
  CompareRows,
  CompareTable,
  type CompareRowData,
} from '@/components/CompareDiff'
import type { ProductWithPrice } from '@/lib/types'
import { formatPrice } from '@/lib/formatPrice'
import { computePriceDrop } from '@/lib/priceDrop'

function parseSlugs(produtos?: string): string[] {
  return (produtos ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ produtos?: string }>
}): Promise<Metadata> {
  const { produtos } = await searchParams
  const slugs = parseSlugs(produtos)

  if (slugs.length === 0) {
    return { title: 'Comparar ténis | Parjusto' }
  }

  const { data: products } = await supabase
    .from('products')
    .select('slug, model_name')
    .in('slug', slugs)

  const ordered = slugs
    .map((slug) => (products ?? []).find((p) => p.slug === slug))
    .filter(Boolean) as { slug: string; model_name: string }[]

  if (ordered.length === 0) {
    return { title: 'Comparar ténis | Parjusto' }
  }

  const names = ordered.map((p) => p.model_name).join(' vs ')

  return {
    title: `A comparar: ${names} | Parjusto`,
    description: `Compara preços entre ${names} nas melhores lojas. Encontra o melhor preço no Parjusto.`,
  }
}

type GroupedOffer = {
  store: string
  price: number
  shippingFreeThreshold: number | null
}

function groupOffers(offers: any[]): GroupedOffer[] {
  const inStock = offers.filter((o) => o.in_stock && !o.discontinued_at)
  const grouped: Record<string, GroupedOffer> = {}

  for (const offer of inStock) {
    const storeName = offer.stores?.name ?? 'Loja'
    if (!grouped[storeName] || offer.price < grouped[storeName].price) {
      grouped[storeName] = {
        store: storeName,
        price: offer.price,
        shippingFreeThreshold: offer.stores?.shipping_free_threshold ?? null,
      }
    }
  }

  return Object.values(grouped).sort((a, b) => a.price - b.price)
}

// Uma linha "difere" quando há mais do que um produto a comparar e nem
// todos têm o mesmo valor nesse critério (null/undefined conta como um
// valor próprio - "sem essa informação" também é uma diferença real).
function rowIsDifferent(values: (string | number | null)[]): boolean {
  if (values.length <= 1) return false
  const normalized = values.map((v) => (v === undefined ? null : v))
  return new Set(normalized).size > 1
}

// Índice do "melhor" valor de uma linha numérica onde MAIS é melhor (lojas
// com stock, % de descida). Só assinala um vencedor quando há pelo menos
// dois produtos com valor conhecido, os valores não são todos iguais, e o
// máximo não está empatado entre dois ou mais produtos.
function bestIndexMax(values: (number | null)[]): number | null {
  const present = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v != null)

  if (present.length < 2) return null
  if (new Set(present.map((x) => x.v)).size <= 1) return null

  const max = Math.max(...present.map((x) => x.v))
  const withMax = present.filter((x) => x.v === max)
  return withMax.length === 1 ? withMax[0].i : null
}

// Mesma lógica que bestIndexMax mas para linhas onde MENOS é melhor (preço
// mais barato, limiar de envio grátis mais baixo).
function bestIndexMin(values: (number | null)[]): number | null {
  const present = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v != null)

  if (present.length < 2) return null
  if (new Set(present.map((x) => x.v)).size <= 1) return null

  const min = Math.min(...present.map((x) => x.v))
  const withMin = present.filter((x) => x.v === min)
  return withMin.length === 1 ? withMin[0].i : null
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-500 mt-2">{description}</p>
      <Link
        href="/catalogo"
        className="inline-block mt-6 bg-gray-900 text-white px-5 py-2.5 rounded-none text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        Ver catálogo
      </Link>
    </main>
  )
}

// Bloco "Preços por loja" + botão "Ver detalhe" de um produto - usado só em
// telemóvel/tablet (<lg), dentro do próprio cartão empilhado, depois das
// características. A partir de lg os preços por loja e o "Ver detalhe"
// passam a ser uma linha da tabela partilhada (ver CompareTable), em vez
// de esta caixa repetida por baixo de cada cartão.
function StorePricesBlock({ offers, slug }: { offers: GroupedOffer[]; slug: string }) {
  const storeBox = offers.length > 0 && (
    <div className="border border-gray-100 rounded-none overflow-hidden">
      <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Preços por loja
      </p>
      {/* Colunas 1 e 2 podem encolher/quebrar linha se o espaço for
          apertado (minmax(0,...)); a coluna do preço fica sempre
          "auto" pura, sem encolher, para nunca cortar o valor. */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto] items-center text-sm">
        {offers.map((offer, offerIndex) => {
          const isLast = offerIndex === offers.length - 1
          const cellBorder = isLast ? '' : 'border-b border-gray-50'
          return (
            <Fragment key={offer.store}>
              <div className={`p-3 text-gray-700 ${cellBorder}`}>{offer.store}</div>
              <div className={`p-3 text-center ${cellBorder}`}>
                {offerIndex === 0 && offers.length > 1 && (
                  <span className="inline-flex items-center bg-[#1F5F58]/10 text-[#1F5F58] text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                    Melhor preço
                  </span>
                )}
              </div>
              <div className={`p-3 text-right font-semibold text-gray-900 whitespace-nowrap ${cellBorder}`}>
                {formatPrice(offer.price)}
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )

  const detailLink = (
    <Link
      href={`/produto/${slug}`}
      className="mt-3 flex items-center justify-center w-full min-h-[48px] rounded-none bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
    >
      Ver detalhe
    </Link>
  )

  return (
    <>
      {storeBox}
      {detailLink}
    </>
  )
}

// Frase de resumo no topo da página (ex.: "Nike Dunk Low é 51,00 € mais
// barato que o Gel-Kayano 14 e está disponível em mais lojas.") - só
// aparece com 2+ produtos com preço conhecido e uma poupança real (nunca
// inventa uma comparação a partir de dados em falta ou empatados).
function buildSummary(withPrice: { name: string; price: number; stock: number }[]) {
  if (withPrice.length < 2) return null

  const cheapest = withPrice.reduce((a, b) => (b.price < a.price ? b : a))
  const priciest = withPrice.reduce((a, b) => (b.price > a.price ? b : a))
  const diff = priciest.price - cheapest.price
  if (diff <= 0) return null

  const cheapestIsUnique = withPrice.filter((x) => x.price === cheapest.price).length === 1
  const others = withPrice.filter((x) => x !== cheapest)
  const stockAdvantage = cheapestIsUnique && cheapest.stock > Math.max(...others.map((x) => x.stock))
  // Com 3 produtos e um vencedor claro, a frase pode afirmar "é o mais
  // barato" (comparado com todos); com 2, ou com um empate no preço mais
  // baixo, mantém-se a comparação direta com o mais caro, sem alegar mais
  // do que os números garantem.
  const superlative = withPrice.length > 2 && cheapestIsUnique

  return {
    cheapestName: cheapest.name,
    priciestName: priciest.name,
    diffLabel: formatPrice(diff),
    stockAdvantage,
    superlative,
  }
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ produtos?: string }>
}) {
  const { produtos } = await searchParams
  const slugs = parseSlugs(produtos)

  let ordered: any[] = []
  if (slugs.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select(`
        *,
        brands (*),
        product_offers (
          id, price, in_stock, discontinued_at,
          stores (name, shipping_free_threshold)
        )
      `)
      .in('slug', slugs)

    ordered = slugs
      .map((slug) => (products ?? []).find((p) => p.slug === slug))
      .filter(Boolean) as any[]

    if (ordered.length === 0) {
      return (
        <EmptyState
          title="Produtos não encontrados"
          description="Os produtos que tentaste comparar já não estão disponíveis."
        />
      )
    }
  }

  const placeholderCount = Math.max(0, 3 - ordered.length)
  const containerMaxWidth = ordered.length < 3 ? 'max-w-4xl' : 'max-w-5xl'

  // Catálogo completo para o seletor "+ Adicionar produto" (mesma pesquisa
  // client-side da homepage, ver lib/searchProducts.ts) - só é preciso
  // quando sobra pelo menos um lugar por preencher.
  let pickerProducts: ProductWithPrice[] = []
  if (placeholderCount > 0) {
    const { data: allProducts } = await supabase
      .from('products')
      .select(`
        *,
        brands (*),
        product_offers (price, in_stock, store_id, size, discontinued_at)
      `)
      .eq('is_active', true)

    pickerProducts = (allProducts ?? []).map((p) => {
      const inStockOffers = p.product_offers.filter((o: any) => o.in_stock && !o.discontinued_at)
      const lowest_price = inStockOffers.length > 0
        ? Math.min(...inStockOffers.map((o: any) => o.price))
        : null
      const distinctStores = new Set(inStockOffers.map((o: any) => o.store_id))
      const sizes = Array.from(new Set(inStockOffers.map((o: any) => o.size))) as string[]
      return { ...p, lowest_price, store_count: distinctStores.size, sizes }
    })
  }

  // Histórico de preços das ofertas em stock dos produtos comparados, só
  // para saber se cada um desceu de preço esta semana (linha "Desceu esta
  // semana" mais abaixo) - mesma lógica de lib/priceDrop.ts usada na
  // homepage, nunca inventa uma descida sem dois dias distintos no
  // histórico.
  const visibleOfferIds = ordered.flatMap((p) =>
    (p.product_offers ?? []).filter((o: any) => o.in_stock && !o.discontinued_at).map((o: any) => o.id)
  )
  const offerIdToProductId = new Map<string, string>()
  for (const p of ordered) {
    for (const o of p.product_offers ?? []) {
      if (o.in_stock && !o.discontinued_at) offerIdToProductId.set(o.id, p.id)
    }
  }
  const historyByProduct = new Map<string, { price: number; recorded_at: string }[]>()
  if (visibleOfferIds.length > 0) {
    const { data: historyRows } = await supabase
      .from('price_history')
      .select('product_offer_id, price, recorded_at')
      .in('product_offer_id', visibleOfferIds)

    for (const row of historyRows ?? []) {
      const productId = offerIdToProductId.get(row.product_offer_id)
      if (!productId) continue
      const list = historyByProduct.get(productId) ?? []
      list.push({ price: row.price, recorded_at: row.recorded_at })
      historyByProduct.set(productId, list)
    }
  }

  // Dados derivados de cada produto comparado: ofertas agrupadas por loja
  // (mais barata primeiro), preço mais baixo, nº de lojas com stock, e
  // percentagem de descida de preço esta semana (null se não houver
  // histórico suficiente - nunca inventada).
  const compareData = ordered.map((product) => {
    const offers = groupOffers(product.product_offers ?? [])
    const lowestPrice = offers[0]?.price ?? null
    const drop = computePriceDrop(historyByProduct.get(product.id) ?? [])
    const discountPercent =
      drop && lowestPrice != null ? Math.round((drop.amount / (lowestPrice + drop.amount)) * 100) : null

    return {
      offers,
      lowestPrice,
      storeCount: offers.length,
      shippingFreeThreshold: offers[0]?.shippingFreeThreshold ?? null,
      discountPercent,
    }
  })

  const comparablePrices = compareData
    .map((d) => d.lowestPrice)
    .filter((price): price is number => price != null)
  const cheapestPrice = comparablePrices.length > 1 ? Math.min(...comparablePrices) : null

  const summary = buildSummary(
    ordered
      .map((p, i) => ({ name: p.model_name as string, price: compareData[i].lowestPrice, stock: compareData[i].storeCount }))
      .filter((x): x is { name: string; price: number; stock: number } => x.price != null)
  )

  // Linhas da tabela de comparação, uma por critério, com o valor já
  // formatado para cada produto (na mesma ordem de "ordered"). "different"
  // decide se a linha aparece com o toggle "só diferenças" ligado; "best"
  // (quando aplicável) assinala o valor mais vantajoso, destacado a
  // verde-petróleo na tabela/cartões.
  const soleValues = ordered.map((p) => p.sole_type ?? null)
  const closureValues = ordered.map((p) => p.closure_type ?? null)
  const colorValues = ordered.map((p) => p.color ?? null)
  const genderValues = ordered.map((p) => p.gender ?? null)
  const storeCountValues = compareData.map((d) => d.storeCount)
  const shippingValues = compareData.map((d) => d.shippingFreeThreshold)
  const discountValues = compareData.map((d) => d.discountPercent)

  const rows: CompareRowData[] = [
    {
      key: 'sole',
      label: 'Sola',
      display: soleValues.map((v) => v ?? '—'),
      different: rowIsDifferent(soleValues),
      best: null,
    },
    {
      key: 'closure',
      label: 'Fecho',
      display: closureValues.map((v) => v ?? '—'),
      different: rowIsDifferent(closureValues),
      best: null,
    },
    {
      key: 'color',
      label: 'Cor',
      display: colorValues.map((v) => v ?? '—'),
      different: rowIsDifferent(colorValues),
      best: null,
    },
    {
      key: 'gender',
      label: 'Género',
      display: genderValues.map((v) => v ?? '—'),
      different: rowIsDifferent(genderValues),
      best: null,
    },
    {
      key: 'stock',
      label: 'Lojas com stock',
      display: storeCountValues.map((v) => String(v)),
      different: rowIsDifferent(storeCountValues),
      best: bestIndexMax(storeCountValues),
    },
    {
      key: 'shipping',
      label: 'Envio grátis',
      display: shippingValues.map((v) => (v != null ? `Acima de ${formatPrice(v)}` : '—')),
      different: rowIsDifferent(shippingValues),
      best: bestIndexMin(shippingValues),
    },
    {
      key: 'discount',
      // Nome deliberadamente diferente do mockup ("Desconto vs. PVP"): não
      // temos preço de tabela/PVP guardado em lado nenhum, só o histórico
      // de preços já verificados - por isso o rótulo diz exactamente o que
      // este número é (descida real esta semana), nunca uma comparação
      // com um PVP que não existe nos dados.
      label: 'Desceu esta semana',
      display: discountValues.map((v) => (v != null ? `-${v}%` : '—')),
      different: rowIsDifferent(discountValues),
      best: bestIndexMax(discountValues),
    },
  ]

  return (
    <main className={`${containerMaxWidth} mx-auto px-6 py-10`}>
      {/* Só sincroniza a seleção partilhada quando o URL traz um ?produtos=
          explícito - visitar /comparar "em branco" não deve apagar uma
          seleção já feita algures (ex.: header, barra flutuante). */}
      {slugs.length > 0 && <CompareSelectionSync slugs={ordered.map((p) => p.slug)} />}

      {/* Sentido inverso: URL vazio mas já pode haver uma seleção guardada
          (localStorage) - restaura-a para o URL em vez de mostrar a página vazia. */}
      {slugs.length === 0 && <CompareRestoreFromStorage />}

      <nav className="text-sm text-gray-400">
        <Link href="/" className="hover:text-gray-600 transition-colors">
          Início
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-gray-500">Comparar</span>
      </nav>

      <CompareDiffProvider>
        {/* flex-col no telemóvel, flex-row a partir de sm (pedido do Jorge):
            com o título "Comparar ténis" a competir por largura com o
            interruptor "Mostrar só as diferenças" na mesma linha, em ecrãs
            estreitos o título era obrigado a quebrar ("Comparar" / "ténis")
            e o interruptor ficava espremido logo a seguir à primeira
            palavra - com mau aspeto. Agora o interruptor cai para a sua
            própria linha, por baixo do título/texto, só no telemóvel; a
            partir de sm mantém-se tal e qual como antes (lado a lado). */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mt-3">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-gray-900 mb-2">
              Comparar ténis
            </h1>
            {placeholderCount > 0 ? (
              <p className="text-sm text-gray-500">Escolhe até 3 produtos no catálogo para comparar.</p>
            ) : (
              <p className="text-gray-500 max-w-xl">
                Três modelos lado a lado, linha a linha. As diferenças ficam marcadas e a melhor opção
                de cada critério fica destacada.
              </p>
            )}
          </div>
          {ordered.length > 1 && (
            <div className="sm:pt-2 shrink-0">
              <CompareDiffToggle />
            </div>
          )}
        </div>

        {summary && (
          <div className="mt-5 flex items-center gap-3 rounded-none bg-[#1F5F58]/5 border border-[#1F5F58]/20 px-4 py-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0 text-[#1F5F58]"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-gray-800">
              <span className="font-semibold">{summary.cheapestName}</span>{' '}
              {summary.superlative ? (
                <>
                  é o mais barato — <span className="font-semibold text-[#1F5F58]">{summary.diffLabel} menos</span>{' '}
                  que {summary.priciestName}
                </>
              ) : (
                <>
                  é <span className="font-semibold text-[#1F5F58]">{summary.diffLabel} mais barato</span> que{' '}
                  {summary.priciestName}
                </>
              )}
              {summary.stockAdvantage && ' e está disponível em mais lojas'}.
            </p>
          </div>
        )}

        {/* Telemóvel/tablet (<lg): cada produto continua num cartão próprio,
            empilhado, com as suas características e preços por loja logo a
            seguir - mais fácil de ler que uma tabela larga num ecrã
            estreito. A partir de lg este bloco desaparece por completo e dá
            lugar ao bloco novo mais abaixo (cartão único com a tabela
            partilhada). */}
        <div className="grid gap-6 mt-8 sm:grid-cols-2 lg:hidden items-start">
          {ordered.map((product, index) => {
            const data = compareData[index]
            const isCheapest = cheapestPrice != null && data.lowestPrice === cheapestPrice
            const remainingSlugs = slugs.filter((s) => s !== product.slug)

            return (
              <div
                key={product.id}
                className="relative flex flex-col rounded-none border border-gray-100 bg-white overflow-hidden"
              >
                <div className="p-6 pb-5">
                  <RemoveCompareButton remainingSlugs={remainingSlugs} label={product.model_name} />

                  <ProductGallery
                    images={product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []}
                    alt={product.model_name}
                    compact
                    imageBoxClassName="aspect-square"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />

                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mt-3">
                    {product.brands?.name}
                  </p>
                  {/* Altura fixa (2 linhas) para o nome - mesmo motivo da
                      versão de desktop: o preço tem de ficar sempre
                      alinhado, mesmo quando os produtos ao lado têm nomes
                      de tamanhos diferentes. */}
                  <h2 className="font-semibold text-gray-900 mt-0.5 leading-6 min-h-[3rem]">
                    {product.model_name}
                  </h2>

                  {data.lowestPrice != null ? (
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-2xl font-extrabold text-gray-900">{formatPrice(data.lowestPrice)}</p>
                      {isCheapest && (
                        <span className="inline-flex items-center bg-[#1F5F58]/10 text-[#1F5F58] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          Mais barato
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm mt-2">Sem oferta disponível</p>
                  )}
                </div>

                <div className="border-t border-gray-100">
                  <CompareRows rows={rows} columnIndex={index} />
                </div>
                <div className="p-4 mt-auto border-t border-gray-100">
                  <StorePricesBlock offers={data.offers} slug={product.slug} />
                </div>
              </div>
            )
          })}

          {placeholderCount > 0 && (
            <div className="flex items-center justify-center py-6">
              <ComparePicker allProducts={pickerProducts} currentSlugs={slugs} />
            </div>
          )}
        </div>

        {/* Desktop (>=lg): um único cartão com a linha dos produtos (foto,
            nome, preço) seguida da tabela partilhada - características e
            "Ver detalhe" alinhados por baixo de cada produto, cada
            característica escrita uma única vez à esquerda. */}
        {ordered.length > 0 && (
          <div className="hidden lg:block mt-8 rounded-none border border-gray-100 bg-white p-6">
            <div className="flex items-start gap-0">
              {/* Tem de ser exactamente a mesma grelha (160px + colunas de
                  240px) do CompareTable em components/CompareDiff.tsx, para
                  as fotos ficarem alinhadas com as colunas da tabela por
                  baixo - se um dia um dos dois lados mudar, o outro tem de
                  mudar também. */}
              <div
                className="grid"
                style={{ gridTemplateColumns: `160px repeat(${ordered.length}, minmax(0, 240px))` }}
              >
                <div />
                {ordered.map((product, index) => {
                  const data = compareData[index]
                  const isCheapest = cheapestPrice != null && data.lowestPrice === cheapestPrice
                  const remainingSlugs = slugs.filter((s) => s !== product.slug)
                  return (
                    <div
                      key={product.id}
                      className={`relative pb-4 ${
                        index > 0 ? 'pl-4 border-l border-gray-100' : 'pr-4 border-r border-transparent'
                      }`}
                    >
                      <RemoveCompareButton remainingSlugs={remainingSlugs} label={product.model_name} />
                      <ProductGallery
                        images={product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []}
                        alt={product.model_name}
                        compact
                        imageBoxClassName="aspect-square"
                        sizes="240px"
                      />
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mt-3">
                        {product.brands?.name}
                      </p>
                      {/* Altura fixa (2 linhas) para o nome do produto -
                          nomes com tamanhos diferentes ("Dunk Low" vs.
                          "Gel-Kayano 14 Black Pure Silver") não podem empurrar
                          o preço para alturas diferentes em cada coluna;
                          pedido do Jorge, os preços têm de ficar sempre
                          alinhados. */}
                      <h2 className="text-sm font-semibold text-gray-900 mt-0.5 leading-5 min-h-[2.5rem]">
                        {product.model_name}
                      </h2>
                      {data.lowestPrice != null ? (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <p className="text-2xl font-extrabold text-gray-900">{formatPrice(data.lowestPrice)}</p>
                          {isCheapest && (
                            <span className="inline-flex items-center bg-[#1F5F58]/10 text-[#1F5F58] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                              Mais barato
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm mt-2">Sem oferta disponível</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {placeholderCount > 0 && (
                <div className="pb-4 pl-4">
                  <ComparePicker allProducts={pickerProducts} currentSlugs={slugs} />
                </div>
              )}
            </div>

            <div className="mt-2">
              <CompareTable
                rows={rows}
                columnCount={ordered.length}
                slugs={ordered.map((p) => p.slug)}
              />
            </div>
          </div>
        )}

        {ordered.length === 0 && (
          <div className="hidden lg:flex mt-8 rounded-none border border-gray-100 bg-white p-10 items-center justify-center">
            <ComparePicker allProducts={pickerProducts} currentSlugs={slugs} />
          </div>
        )}
      </CompareDiffProvider>

      {ordered.length > 1 && (
        <div className="mt-6">
          <div className="rounded-none border border-gray-200 bg-white p-6 flex items-center gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-500" aria-hidden="true">
                <path
                  d="M17 2l4 4-4 4M3 12v-2a4 4 0 014-4h14M7 22l-4-4 4-4M21 12v2a4 4 0 01-4 4H3"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-[160px]">
              <h3 className="font-semibold text-gray-900">Trocar um modelo</h3>
              <p className="text-sm text-gray-500 mt-0.5">Remove um dos produtos e escolhe outro no catálogo.</p>
            </div>
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center rounded-none border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:border-gray-400 transition-colors"
            >
              Escolher no catálogo
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
