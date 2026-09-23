// components/CompararPreview.tsx
import Link from 'next/link'
import CompararPreviewCta from '@/components/CompararPreviewCta'
import { dedupeColor } from '@/lib/formatColor'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductOfferWithStore, ProductWithPrice } from '@/lib/types'
import FavoriteButton from '@/components/FavoriteButton'

type GroupedOffer = {
  store: string
  price: number
}

// Campos que existem em tempo de execução (vêm da query de
// lib/getProductsWithPrice.ts) mas não estão declarados em lib/types.ts.
type Offer = ProductOfferWithStore & { discontinued_at?: string | null }
type CompareProduct = ProductWithPrice & {
  material?: string | null
  sole_type?: string | null
  closure_type?: string | null
  product_offers?: Offer[]
}

// Mesma logica de agrupamento por loja (preco mais baixo por loja, so
// ofertas em stock e nao descontinuadas) ja usada em app/comparar/page.tsx -
// para o selo "mais barato" bater certo com o que a pagina /comparar
// mostraria para os mesmos 2 produtos.
function groupOffers(offers: Offer[] | undefined): GroupedOffer[] {
  const inStock = (offers ?? []).filter((o) => o.in_stock && !o.discontinued_at)
  const grouped: Record<string, GroupedOffer> = {}

  for (const offer of inStock) {
    const storeName = offer.stores?.name ?? 'Loja'
    if (!grouped[storeName] || offer.price < grouped[storeName].price) {
      grouped[storeName] = { store: storeName, price: offer.price }
    }
  }

  return Object.values(grouped).sort((a, b) => a.price - b.price)
}

// Mesmas especificacoes tecnicas da pagina /comparar (material, sola, fecho,
// cor) - vem diretamente das colunas reais da tabela products (nunca
// inventadas).
const SPEC_DEFS = [
  { key: 'material', label: 'Material' },
  { key: 'sole_type', label: 'Sola' },
  { key: 'closure_type', label: 'Fecho' },
  { key: 'color', label: 'Cor' },
] as const

// Cor sem partes repetidas (ver lib/formatColor.ts - a mesma regra é
// usada na página /comparar).
function formatSpecValue(key: string, value: string | null | undefined): string {
  if (!value) return '—'
  if (key !== 'color') return value
  return dedupeColor(value) ?? value
}

// Regras visuais aplicadas nesta secção (4.ª ronda - pedido do Jorge para
// tirar o "aspeto gerado por IA", seguindo o mockup dele à risca):
// - Fundo branco, sem caixa cinza à volta da secção nem caixas dentro de
//   caixas. Mesma largura/margens da secção "A diferença que ninguém te
//   mostra" (DiferencaPrecos), para as duas alinharem pela esquerda.
// - Só as cores de texto já usadas na DiferencaPrecos: #17232B (principal)
//   e #5C6770 (secundário, 5,79:1 de contraste). Um único acento, o verde
//   da marca (#123F3A sobre #E8F2EF), só no selo "mais barato".
// - Título com as mesmas classes do título da DiferencaPrecos.
// - Rótulos pequenos todos iguais: 11px, maiúsculas, peso 500, letras
//   espaçadas. Nada abaixo de 11px.
// - Sem sombras nem cor néon; profundidade só com linhas de 1px, sempre na
//   mesma cor (LINE).
// - Tabela como no mockup do Jorge: coluna de rótulos à esquerda (cada
//   característica aparece uma só vez - mesma regra aprovada para /comparar
//   a 14 set), coluna fina "VS" entre os 2 produtos. No telemóvel o rótulo
//   passa a uma linha própria por cima dos 2 valores.
// - Um só selo por produto: saiu o "-X%" daqui (continua nos cartões do
//   catálogo); fica só "X € mais barato" no mais barato dos 2. Frase
//   escolhida em vez de "Poupa X €" porque são 2 modelos diferentes - não é
//   a mesma poupança entre lojas que o "Poupa" significa no resto do site.
// - Preços sempre na mesma linha nos 2 lados (o selo vai por baixo do
//   preço, nunca ao lado, para não desalinhar quando quebra de linha).
// - Fotos dos produtos: a foto principal já vem com fundo normalizado
//   (#F9FBFC, ver ProductCard.tsx), por isso o fundo da área da foto usa
//   exatamente essa cor - a foto funde-se com o fundo, sem "caixa".
// - Foto decorativa do topo: horizontal (16:9, como no mockup), escolhida
//   entre as fotos enviadas pelo Jorge - atualmente um All Star preto e um
//   branco, pernas cruzadas contra uma parede branca (trocada a pedido do
//   Jorge: tons neutros a condizer com o site, em vez da foto escura das
//   duas mãos com Yeezy). Só
//   decoração - nunca um dos 2 produtos comparados.
//
// Ajustes da 5.ª ronda (pedido do Jorge):
// - Título maior (44px no desktop, 32px no telemóvel, letras ligeiramente
//   mais juntas) e bloco de texto mais compacto (menos espaço entre
//   etiqueta, título, texto e botão).
// - Foto com mais presença: ocupa 7 de 12 colunas (era metade) e foi
//   reenquadrada centrada nos 2 ténis, com a mesma margem dos 2 lados
//   (antes o ténis da esquerda ficava quase colado à borda).
// - Botão preenchido a verde da marca (#123F3A, texto branco) - igual ao
//   "Ver este par" da DiferencaPrecos.
// - "VS" volta a ser o círculo escuro com texto branco (sem sombra), em
//   cima de uma só linha vertical fina entre os 2 produtos.
//
// Correções da 6.ª ronda (análise crítica pedida pelo Jorge):
// - O botão deixou de levar a uma página vazia: abre o /comparar já com
//   estes 2 ténis quando a pessoa não tem nenhuma comparação guardada (ver
//   CompararPreviewCta.tsx - nunca apaga uma comparação já montada).
// - Foto e nome de cada ténis levam à página do produto, com um zoom
//   discreto na foto ao passar o rato.
// - A coluna de rótulos deixou de estar vazia ao lado do nome e do preço:
//   "Modelo" e "Preço" (só no desktop - no telemóvel não há essa coluna).
// - Cor sem repetições: "Core Black / Core Black / Core Black" passa a
//   "Core Black" (só se tiram partes repetidas, nunca se inventa nada).
// - Título com a escala comum a todas as secções da homepage e
//   text-balance (linhas equilibradas, sem palavras soltas).
const LINE = 'border-[#17232B]/10'
const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'
const GRID = 'grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)_48px_minmax(0,1fr)]'

export default function CompararPreview({ products }: { products: ProductWithPrice[] }) {
  if (products.length < 2) return null
  const [a, b] = products as CompareProduct[]

  const lowestPrices: (number | null)[] = [a, b].map(
    (p) => groupOffers(p.product_offers)[0]?.price ?? p.lowest_price ?? null
  )
  const bothPrices = lowestPrices[0] != null && lowestPrices[1] != null
  const cheapestPrice = bothPrices ? Math.min(lowestPrices[0]!, lowestPrices[1]!) : null
  const priceDiff = bothPrices ? Math.abs(lowestPrices[0]! - lowestPrices[1]!) : null

  // So mostra uma linha de especificacao quando pelo menos um dos 2
  // produtos tem esse dado.
  const specRows = SPEC_DEFS.filter(({ key }) => a[key] || b[key])

  // Célula da coluna "VS": uma só linha vertical fina ao centro, repetida
  // em todas as linhas da tabela para a linha ficar contínua.
  const vsLine = 'pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#17232B]/10'
  const vsCell = (
    <div aria-hidden="true" className="relative">
      <span className={vsLine} />
    </div>
  )
  // Célula vazia da coluna de rótulos (só no desktop) - linha das fotos.
  const labelSpacer = <div aria-hidden="true" className={`hidden sm:block sm:border-r ${LINE}`} />
  // Célula da coluna de rótulos com texto (só no desktop) - linhas do nome
  // e do preço, com a mesma altura de linha do conteúdo ao lado para
  // ficarem alinhados.
  const rowLabel = (text: string, extra: string) => (
    <p className={`hidden sm:block sm:border-r sm:px-6 ${LINE} ${LABEL} ${extra}`}>{text}</p>
  )

  return (
    <section className="py-16 sm:px-6 sm:py-24">
      {/* Topo: intro compacta à esquerda (5 colunas), foto decorativa com
          mais presença à direita (7 colunas). */}
      <div className="grid gap-8 sm:grid-cols-12 sm:items-center sm:gap-12">
        <div className="sm:col-span-5">
          <p className={LABEL}>Comparador</p>
          <h2 className="mt-2 font-display text-[32px] sm:text-[44px] font-bold leading-[1.05] tracking-[-0.02em] text-balance text-[#17232B]">
            Vê os ténis lado a lado.
          </h2>
          <p className="mt-3 max-w-[26rem] text-base leading-relaxed text-[#5C6770]">
            Seleciona dois ténis e vê-os lado a lado, com preço, especificações e loja — sem abrir dez separadores.
          </p>
          <CompararPreviewCta
            slugs={[a.slug, b.slug]}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-none bg-[#123F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
          />
        </div>
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-none bg-[#F9FBFC] sm:col-span-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marketing/comparar-allstar-1600.jpg"
            srcSet="/marketing/comparar-allstar-800.jpg 800w, /marketing/comparar-allstar-1600.jpg 1600w"
            sizes="(max-width: 640px) 100vw, 58vw"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Tabela de comparação com os 2 produtos reais. */}
      <div className={`mt-12 border sm:mt-16 ${LINE}`}>
        {/* Fotos */}
        <div className={GRID}>
          {labelSpacer}
          <ProductPhoto product={a} />
          {/* Coluna "VS" - círculo escuro com texto branco, sem sombra, em
              cima da linha vertical, a meio da altura das fotos. */}
          <div className="relative">
            <span aria-hidden="true" className={vsLine} />
            <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#17232B] text-[11px] font-bold uppercase text-white sm:h-8 sm:w-8">
              vs
            </span>
          </div>
          <ProductPhoto product={b} />
        </div>

        {/* Marca e nome */}
        <div className={GRID}>
          {rowLabel('Modelo', 'sm:pt-1')}
          <ProductName product={a} />
          {vsCell}
          <ProductName product={b} />
        </div>

        {/* Preço - sempre na 1.ª linha da célula, selo por baixo */}
        <div className={GRID}>
          {rowLabel('Preço', 'sm:pt-2 sm:leading-7')}
          <PriceCell price={lowestPrices[0]} cheapestPrice={cheapestPrice} priceDiff={priceDiff} />
          {vsCell}
          <PriceCell price={lowestPrices[1]} cheapestPrice={cheapestPrice} priceDiff={priceDiff} />
        </div>

        {/* Especificações - rótulo uma só vez (coluna da esquerda no
            desktop, linha própria no telemóvel) */}
        {specRows.map(({ key, label }) => (
          <div key={label} className={`${GRID} border-t ${LINE}`}>
            {/* sm:leading-6 no rótulo e nos valores: mesma altura de linha
                (24px) para o rótulo pequeno ficar alinhado com a 1.ª linha
                do valor ao lado, em vez de ficar mais acima. */}
            <p className={`col-span-3 px-3 pt-4 sm:col-span-1 sm:border-r sm:px-6 sm:py-5 sm:leading-6 ${LINE} ${LABEL}`}>{label}</p>
            <p className="px-3 pb-4 pt-2 text-sm leading-relaxed text-[#17232B] sm:px-6 sm:py-5 sm:text-[15px] sm:leading-6">{formatSpecValue(key, a[key])}</p>
            {/* No telemóvel as especificações ficam sem as linhas verticais
                do "VS" (o rótulo por cima já as interrompia a cada linha). */}
            <div aria-hidden="true" className="relative">
              <span className={`hidden sm:block ${vsLine}`} />
            </div>
            <p className="px-3 pb-4 pt-2 text-sm leading-relaxed text-[#17232B] sm:px-6 sm:py-5 sm:text-[15px] sm:leading-6">{formatSpecValue(key, b[key])}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProductPhoto({ product }: { product: CompareProduct }) {
  return (
    <div className="p-3 sm:p-6">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-none bg-[#F9FBFC]">
        {/* A foto leva à página do produto (zoom discreto ao passar o
            rato). O coração fica fora do link, por cima - um botão dentro
            de um link não é HTML válido. */}
        <Link href={`/produto/${product.slug}`} prefetch={false} className="group absolute inset-0 block">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.model_name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <span className="sr-only">{product.model_name}</span>
          )}
        </Link>
        <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
          <FavoriteButton slug={product.slug} />
        </div>
      </div>
    </div>
  )
}

function PriceCell({
  price,
  cheapestPrice,
  priceDiff,
}: {
  price: number | null
  cheapestPrice: number | null
  priceDiff: number | null
}) {
  // Selo só no mais barato dos 2, e só quando há mesmo diferença.
  const isCheapest = price != null && price === cheapestPrice && priceDiff != null && priceDiff > 0
  return (
    <div className="flex flex-col items-start gap-2 px-3 pb-5 pt-2 sm:px-6 sm:pb-6">
      {price != null ? (
        <p className="text-xl font-bold tabular-nums text-[#17232B]">{formatPrice(price)}</p>
      ) : (
        <p className="text-sm text-[#5C6770]">Sem oferta disponível</p>
      )}
      {isCheapest && (
        // No telemóvel a coluna é estreita e "50,00 € mais barato" partia em
        // 2 linhas dentro da pílula (ficava uma "bolha"). Aí mostra só "Mais
        // barato" - como no /comparar - e a diferença vê-se logo pelos 2
        // preços lado a lado; no desktop mantém o valor.
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#E8F2EF] px-2.5 py-1 text-[11px] font-medium text-[#123F3A]">
          <span className="sm:hidden">Mais barato</span>
          <span className="hidden sm:inline">{formatPrice(priceDiff!)} mais barato</span>
        </span>
      )}
    </div>
  )
}

function ProductName({ product }: { product: CompareProduct }) {
  return (
    <div className="px-3 pt-1 sm:px-6">
      <p className={LABEL}>{product.brands?.name}</p>
      <h3 className="mt-1 text-[15px] font-medium leading-snug text-[#17232B]">
        <Link
          href={`/produto/${product.slug}`}
          prefetch={false}
          className="underline-offset-4 decoration-[#17232B]/30 hover:underline"
        >
          {product.model_name}
        </Link>
      </h3>
    </div>
  )
}
