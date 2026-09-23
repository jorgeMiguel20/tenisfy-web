// components/CompararPreview.tsx
import Link from 'next/link'
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
//   entre as fotos enviadas pelo Jorge (duas mãos, um ténis em cada). Só
//   decoração - nunca um dos 2 produtos comparados.
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

  // Célula vazia da coluna "VS" (só as 2 linhas verticais), repetida em
  // todas as linhas da tabela para as linhas ficarem contínuas.
  const vsCell = <div aria-hidden="true" className={`border-x ${LINE}`} />
  // Célula vazia da coluna de rótulos (só no desktop).
  const labelSpacer = <div aria-hidden="true" className={`hidden sm:block sm:border-r ${LINE}`} />

  return (
    <section className="py-16 sm:px-6 sm:py-24">
      {/* Topo: intro à esquerda, foto decorativa à direita, alturas
          equivalentes (foto 16:9 ao lado de um bloco de texto curto). */}
      <div className="grid gap-8 sm:grid-cols-2 sm:items-center sm:gap-12">
        <div>
          <p className={LABEL}>Comparador</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold leading-[1.1] text-[#17232B]">
            Vê os ténis lado a lado.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[#5C6770]">
            Seleciona dois ténis e vê-os lado a lado, com preço, especificações e loja — sem abrir dez separadores.
          </p>
          <Link
            href="/comparar"
            className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-none border border-[#17232B] px-5 text-sm font-semibold text-[#17232B] transition-colors hover:bg-[#17232B] hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M8 3 4 7l4 4" />
              <path d="M4 7h16" />
              <path d="M16 21l4-4-4-4" />
              <path d="M20 17H4" />
            </svg>
            Ir para o comparador
          </Link>
        </div>
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-none bg-[#F9FBFC]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marketing/comparar-maos-1280.jpg"
            srcSet="/marketing/comparar-maos-720.jpg 720w, /marketing/comparar-maos-1280.jpg 1280w"
            sizes="(max-width: 640px) 100vw, 50vw"
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
          {/* Coluna "VS" - texto discreto na vertical, sem círculo nem
              sombra (como no mockup do Jorge). */}
          <div className={`flex items-center justify-center border-x ${LINE}`}>
            <span className={`${LABEL} [writing-mode:vertical-rl] rotate-180`}>vs</span>
          </div>
          <ProductPhoto product={b} />
        </div>

        {/* Marca e nome */}
        <div className={GRID}>
          {labelSpacer}
          <ProductName product={a} />
          {vsCell}
          <ProductName product={b} />
        </div>

        {/* Preço - sempre na 1.ª linha da célula, selo por baixo */}
        <div className={GRID}>
          {labelSpacer}
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
            <p className="px-3 pb-4 pt-2 text-sm leading-relaxed text-[#17232B] sm:px-6 sm:py-5 sm:text-[15px] sm:leading-6">{a[key] ?? '—'}</p>
            {/* No telemóvel as especificações ficam sem as linhas verticais
                do "VS" (o rótulo por cima já as interrompia a cada linha). */}
            <div aria-hidden="true" className={`sm:border-x ${LINE}`} />
            <p className="px-3 pb-4 pt-2 text-sm leading-relaxed text-[#17232B] sm:px-6 sm:py-5 sm:text-[15px] sm:leading-6">{b[key] ?? '—'}</p>
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
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.model_name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : null}
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
        <span className="inline-flex items-center rounded-full bg-[#E8F2EF] px-2.5 py-1 text-[11px] font-medium text-[#123F3A]">
          {formatPrice(priceDiff!)} mais barato
        </span>
      )}
    </div>
  )
}

function ProductName({ product }: { product: CompareProduct }) {
  return (
    <div className="px-3 pt-1 sm:px-6">
      <p className={LABEL}>{product.brands?.name}</p>
      <h3 className="mt-1 text-[15px] font-medium leading-snug text-[#17232B]">{product.model_name}</h3>
    </div>
  )
}
