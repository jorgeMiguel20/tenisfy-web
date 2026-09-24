// app/comparar/page.tsx
import { supabase } from '@/lib/supabase'
import { productSelect } from '@/lib/productColumns'
import Link from 'next/link'
import type { Metadata } from 'next'
import ComparePicker, { type PickerProduct } from '@/components/ComparePicker'
import RemoveCompareButton from '@/components/RemoveCompareButton'
import CompareSelectionSync from '@/components/CompareSelectionSync'
import CompareRestoreFromStorage from '@/components/CompareRestoreFromStorage'
import {
  CompareDiffProvider,
  CompareDiffToggle,
  CompareTable,
  type CompareRowData,
} from '@/components/CompareDiff'
import { formatPrice } from '@/lib/formatPrice'
import { computePriceDrop } from '@/lib/priceDrop'
import { dedupeColor } from '@/lib/formatColor'
import { COMPARE_GRID, COMPARE_LABEL, COMPARE_LINE, compareGridStyle, valueCellClass } from '@/lib/compareGrid'

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

// Só os campos que esta página usa de cada ténis e de cada oferta (a
// consulta traz as colunas de lib/productColumns.ts + marca + ofertas).
type CompareOfferRow = {
  id: string
  price: number
  in_stock: boolean
  discontinued_at: string | null
  stores: { name: string; shipping_free_threshold: number | null } | null
}

type CompareProductRow = {
  id: string
  slug: string
  model_name: string
  image_url: string | null
  gender: string | null
  color: string | null
  sole_type: string | null
  closure_type: string | null
  brands: { name: string } | null
  product_offers: CompareOfferRow[] | null
}

type GroupedOffer = {
  store: string
  price: number
  shippingFreeThreshold: number | null
}

function groupOffers(offers: CompareOfferRow[]): GroupedOffer[] {
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

// Página sem produtos encontrados (slugs do URL que já não existem) -
// mesmas regras visuais do resto do site.
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 text-center md:py-24">
      <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-balance text-[#17232B] md:text-[44px]">
        {title}
      </h1>
      <p className="mt-3 text-base text-[#5C6770]">{description}</p>
      <Link
        href="/catalogo"
        className="mt-6 inline-flex min-h-[44px] items-center rounded-none bg-[#123F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
      >
        Ver catálogo
      </Link>
    </main>
  )
}

// "homem" -> "Homem", "unissexo" -> "Unissexo" (o valor vem em minúsculas
// da base de dados; só muda a primeira letra, nunca o conteúdo).
function capitalize(value: string | null): string | null {
  if (!value) return value
  return value.charAt(0).toLocaleUpperCase('pt-PT') + value.slice(1)
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

  let ordered: CompareProductRow[] = []
  if (slugs.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select(productSelect(`
        brands (*),
        product_offers (
          id, price, in_stock, discontinued_at,
          stores (name, shipping_free_threshold)
        )
      `))
      .in('slug', slugs)

    const rowsFromDb = (products ?? []) as unknown as CompareProductRow[]
    ordered = slugs
      .map((slug) => rowsFromDb.find((p) => p.slug === slug))
      .filter((p): p is CompareProductRow => p != null)

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

  // Catálogo para o seletor "+ Adicionar produto" (mesma pesquisa
  // client-side da homepage, ver lib/searchProducts.ts) - só é preciso
  // quando sobra pelo menos um lugar por preencher.
  // Só com os campos que o seletor mostra/pesquisa (nome, marca, foto,
  // preço mais baixo): esta lista vai inteira para o browser, e antes ia
  // com todas as colunas de cada ténis (incluindo o "embedding" da
  // pesquisa por foto), o que tornava o /comparar bem mais pesado sem
  // nenhum benefício visível.
  let pickerProducts: PickerProduct[] = []
  if (placeholderCount > 0) {
    const { data: allProducts } = await supabase
      .from('products')
      .select(`
        id, slug, model_name, image_url,
        brands (name),
        product_offers (price, in_stock, discontinued_at)
      `)
      .eq('is_active', true)

    type PickerRow = {
      id: string
      slug: string
      model_name: string
      image_url: string | null
      brands: { name: string } | null
      product_offers: { price: number; in_stock: boolean; discontinued_at: string | null }[] | null
    }
    pickerProducts = ((allProducts ?? []) as unknown as PickerRow[]).map((p) => {
      const inStockOffers = (p.product_offers ?? []).filter((o) => o.in_stock && !o.discontinued_at)
      const lowest_price = inStockOffers.length > 0
        ? Math.min(...inStockOffers.map((o) => o.price))
        : null
      return {
        id: p.id,
        slug: p.slug,
        model_name: p.model_name,
        image_url: p.image_url ?? null,
        brands: p.brands ? { name: p.brands.name } : null,
        lowest_price,
      }
    })
  }

  // Histórico de preços das ofertas em stock dos produtos comparados, só
  // para saber se cada um desceu de preço esta semana (linha "Desceu esta
  // semana" mais abaixo) - mesma lógica de lib/priceDrop.ts usada na
  // homepage, nunca inventa uma descida sem dois dias distintos no
  // histórico.
  const visibleOfferIds = ordered.flatMap((p) =>
    (p.product_offers ?? []).filter((o) => o.in_stock && !o.discontinued_at).map((o) => o.id)
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
      .map((p, i) => ({ name: p.model_name, price: compareData[i].lowestPrice, stock: compareData[i].storeCount }))
      .filter((x): x is { name: string; price: number; stock: number } => x.price != null)
  )

  // Linhas da tabela de comparação, uma por critério, com o valor já
  // formatado para cada produto (na mesma ordem de "ordered"). "different"
  // decide se a linha aparece com o toggle "só diferenças" ligado; "best"
  // (quando aplicável) assinala o valor mais vantajoso, destacado a
  // verde-petróleo na tabela/cartões.
  const soleValues = ordered.map((p) => p.sole_type ?? null)
  const closureValues = ordered.map((p) => p.closure_type ?? null)
  // Cor sem partes repetidas ("Core Black / Core Black / Core Black" ->
  // "Core Black") - mesma regra da homepage, ver lib/formatColor.ts.
  const colorValues = ordered.map((p) => dedupeColor(p.color))
  const genderValues = ordered.map((p) => capitalize(p.gender ?? null))
  const storeCountValues = compareData.map((d) => d.storeCount)
  // Nome da loja com o preço mais baixo de cada ténis (dado real das
  // ofertas em stock) - substitui a lista "Preços por loja" que só existia
  // no telemóvel; a lista completa continua na página de cada produto.
  const cheapestStoreValues = compareData.map((d) => d.offers[0]?.store ?? null)
  const shippingValues = compareData.map((d) => d.shippingFreeThreshold)
  const discountValues = compareData.map((d) => d.discountPercent)

  const allRows: CompareRowData[] = [
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
      key: 'cheapestStore',
      label: 'Loja mais barata',
      display: cheapestStoreValues.map((v) => v ?? '—'),
      different: rowIsDifferent(cheapestStoreValues),
      best: null,
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

  // Linhas sem nenhum dado em nenhum dos ténis (ex.: "Desceu esta semana"
  // quando nenhum desceu) não mostram nada de útil - só aparecem quando
  // pelo menos um ténis tem esse dado. Nunca se inventa um valor.
  const rows = allRows.filter((row) => row.display.some((v) => v !== '—'))

  // Redesenho da página (pedido do Jorge: melhorar o desktop e,
  // sobretudo, o telemóvel), com as mesmas regras visuais da homepage:
  // cantos retos, linhas de 1px numa só cor, sem sombras nem fundos
  // cinzentos alternados, etiquetas de 11px, título na escala 32/44px,
  // botões verdes #123F3A.
  // - Uma só grelha para fotos, nomes, preços e características (ver
  //   lib/compareGrid.ts): as colunas ficam sempre alinhadas.
  // - Telemóvel: os ténis ficam lado a lado (como no comparador da
  //   homepage), em vez de um cartão enorme por ténis empilhados.
  // - Nome e preço de cada ténis ficam presos no topo ao descer a página
  //   (logo abaixo do cabeçalho do site, que tem 76px), para se saber
  //   sempre a que ténis pertence cada coluna.
  const withSlot = placeholderCount > 0 && ordered.length > 0
  const gridStyle = compareGridStyle(ordered.length, withSlot)
  const orderedSlugs = ordered.map((p) => p.slug)

  // Célula vazia da coluna dos nomes das características (só a partir de md).
  const labelSpacer = <div aria-hidden="true" className="hidden md:block" />

  const mobilePicker = withSlot ? (
    <div className="md:hidden">
      <ComparePicker allProducts={pickerProducts} currentSlugs={slugs} fullWidth />
    </div>
  ) : null

  return (
    <main className="mx-auto max-w-5xl px-6 pb-16 pt-8 md:pb-24">
      {/* Só sincroniza a seleção partilhada quando o URL traz um ?produtos=
          explícito - visitar /comparar "em branco" não deve apagar uma
          seleção já feita algures (ex.: header, barra flutuante). */}
      {slugs.length > 0 && <CompareSelectionSync slugs={orderedSlugs} />}

      {/* Sentido inverso: URL vazio mas já pode haver uma seleção guardada
          (localStorage) - restaura-a para o URL em vez de mostrar a página vazia. */}
      {slugs.length === 0 && <CompareRestoreFromStorage />}

      <nav className="text-[13px] text-[#5C6770]">
        <Link href="/" className="transition-colors hover:text-[#17232B]">
          Início
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#17232B]">Comparar</span>
      </nav>

      <CompareDiffProvider>
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <p className={COMPARE_LABEL}>Comparador</p>
            <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-balance text-[#17232B] md:text-[44px]">
              Comparar ténis
            </h1>
            <p className="mt-3 max-w-[34rem] text-pretty text-base leading-relaxed text-[#5C6770]">
              {ordered.length === 0
                ? 'Escolhe até 3 ténis do catálogo para os veres lado a lado.'
                : 'Até 3 ténis lado a lado. Quando um leva vantagem, como no preço ou nas lojas com stock, o valor fica a verde.'}
            </p>
          </div>
          {ordered.length > 1 && (
            <div className="shrink-0">
              <CompareDiffToggle />
            </div>
          )}
        </div>

        {/* Resumo numa linha simples entre duas linhas de 1px (antes era
            uma caixa com fundo verde e ícone). Só aparece com uma
            diferença de preço real - ver buildSummary. */}
        {summary && (
          <p className={`-mx-3 mt-8 border-y px-3 py-4 text-[15px] leading-relaxed text-[#17232B] md:mx-0 md:px-0 ${COMPARE_LINE}`}>
            <span className="font-semibold">{summary.cheapestName}</span>{' '}
            {summary.superlative ? (
              <>
                é o mais barato: <span className="font-semibold text-[#123F3A]">{summary.diffLabel} menos</span> que{' '}
                {summary.priciestName}
              </>
            ) : (
              <>
                é <span className="font-semibold text-[#123F3A]">{summary.diffLabel} mais barato</span> que{' '}
                {summary.priciestName}
              </>
            )}
            {summary.stockAdvantage && ' e está disponível em mais lojas'}.
          </p>
        )}

        {/* Sem produtos: só o lugar vazio com o seletor. */}
        {ordered.length === 0 && (
          <div className="mt-10 flex min-h-[240px] items-center justify-center bg-[#F9FBFC] p-6">
            <ComparePicker allProducts={pickerProducts} currentSlugs={slugs} />
          </div>
        )}

        {/* Com 1 só ténis, no telemóvel o botão para adicionar o segundo
            vem logo antes da comparação (é o passo seguinte). */}
        {ordered.length === 1 && <div className="mt-8">{mobilePicker}</div>}

        {ordered.length > 0 && (
          // Com o resumo por cima, a linha de baixo do resumo serve de
          // topo da tabela (evita duas linhas paralelas muito próximas).
          <div className={summary ? '' : 'mt-10'}>
            {/* Fotos */}
            <div className={`${COMPARE_GRID} ${summary ? '' : `border-t ${COMPARE_LINE}`}`} style={gridStyle}>
              {labelSpacer}
              {ordered.map((product, index) => {
                const remainingSlugs = slugs.filter((s) => s !== product.slug)
                return (
                  <div key={product.id} className={`${valueCellClass(index)} pt-4 md:pt-6`}>
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-none bg-[#F9FBFC]">
                      <Link href={`/produto/${product.slug}`} prefetch={false} className="group absolute inset-0 block">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.model_name}
                            className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                          />
                        ) : (
                          <span className="sr-only">{product.model_name}</span>
                        )}
                      </Link>
                      {/* × por cima da foto só a partir de md; no telemóvel as
                          fotos são pequenas e o círculo tapava o ténis, por
                          isso aí é um botão de texto por baixo da foto. */}
                      <div className="hidden md:block">
                        <RemoveCompareButton remainingSlugs={remainingSlugs} label={product.model_name} />
                      </div>
                    </div>
                    <div className="md:hidden">
                      <RemoveCompareButton remainingSlugs={remainingSlugs} label={product.model_name} variant="text" />
                    </div>
                  </div>
                )
              })}
              {withSlot && (
                <div className={`hidden md:block md:border-l md:px-6 md:pt-6 ${COMPARE_LINE}`}>
                  {/* Lugar livre, com o mesmo tamanho e fundo das fotos. */}
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-[#F9FBFC] p-4">
                    <ComparePicker allProducts={pickerProducts} currentSlugs={slugs} fullWidth />
                  </div>
                </div>
              )}
            </div>

            {/* Nome e preço - ficam presos no topo ao descer a página. */}
            <div
              // -mb-px: a linha de baixo desta faixa fica exatamente por cima
              // da linha de cima da primeira característica (senão viam-se
              // duas linhas juntas); quando a faixa fica presa no topo, a
              // sua própria linha separa-a do conteúdo que passa por baixo.
              className={`${COMPARE_GRID} sticky top-[76px] z-20 -mb-px border-b bg-white ${COMPARE_LINE}`}
              style={gridStyle}
            >
              <p className={`hidden md:block md:pr-6 md:pt-4 ${COMPARE_LABEL}`}>Modelo e preço</p>
              {ordered.map((product, index) => {
                const data = compareData[index]
                const isCheapest = cheapestPrice != null && data.lowestPrice === cheapestPrice
                return (
                  <div key={product.id} className={`${valueCellClass(index)} py-3 md:py-4`}>
                    <p className={`truncate ${COMPARE_LABEL}`}>{product.brands?.name}</p>
                    <h2 className="mt-0.5 line-clamp-3 text-[13px] font-medium leading-snug text-[#17232B] md:text-[15px]">
                      <Link
                        href={`/produto/${product.slug}`}
                        prefetch={false}
                        className="decoration-[#17232B]/30 underline-offset-4 hover:underline"
                      >
                        {product.model_name}
                      </Link>
                    </h2>
                    {data.lowestPrice != null ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p
                          className={`text-base font-bold tabular-nums md:text-xl ${
                            isCheapest ? 'text-[#123F3A]' : 'text-[#17232B]'
                          }`}
                        >
                          {formatPrice(data.lowestPrice)}
                        </p>
                        {isCheapest && (
                          <>
                            <span className="text-[11px] font-medium text-[#123F3A] md:hidden">Mais barato</span>
                            <span className="hidden items-center whitespace-nowrap rounded-full bg-[#E8F2EF] px-2.5 py-1 text-[11px] font-medium text-[#123F3A] md:inline-flex">
                              Mais barato
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[13px] text-[#5C6770]">Sem oferta disponível</p>
                    )}
                  </div>
                )
              })}
              {withSlot && <div aria-hidden="true" className={`hidden md:block md:border-l ${COMPARE_LINE}`} />}
            </div>

            <CompareTable rows={rows} slugs={orderedSlugs} withSlot={withSlot} gridStyle={gridStyle} />
          </div>
        )}
      </CompareDiffProvider>

      {/* Com 2 ténis, no telemóvel o botão para juntar um terceiro fica
          no fim da comparação. */}
      {ordered.length === 2 && <div className="mt-8">{mobilePicker}</div>}

      {/* Antes era um cartão com ícone num círculo cinzento; agora é só uma
          linha de texto com o link. */}
      {ordered.length > 1 && (
        <p className="mt-8 text-sm leading-relaxed text-[#5C6770]">
          Para trocar um modelo, remove-o e escolhe outro.{' '}
          <Link
            href="/catalogo"
            className="font-semibold text-[#17232B] underline decoration-[#17232B]/30 underline-offset-4 transition-colors hover:decoration-[#17232B]"
          >
            Ver catálogo
          </Link>
        </p>
      )}
    </main>
  )
}
