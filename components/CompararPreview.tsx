// components/CompararPreview.tsx
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'
import ProductGallery from '@/components/ProductGallery'
import FavoriteButton from '@/components/FavoriteButton'

type GroupedOffer = {
  store: string
  price: number
}

// Mesma logica de agrupamento por loja (preco mais baixo por loja, so
// ofertas em stock e nao descontinuadas) ja usada em app/comparar/page.tsx -
// para o badge "Mais barato" bater certo com o que a pagina /comparar
// mostraria para os mesmos 2 produtos.
function groupOffers(offers: any[]): GroupedOffer[] {
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

// Mesma formula do selo "-X%" do components/ProductCard.tsx (grelha do
// catalogo) - percentagem sobre uma descida de preco REAL (priceDrop, do
// historico de precos) ou, na falta dessa, a poupanca real entre lojas
// (savings). Nunca um "preco original"/"preco de referencia" inventado -
// isso nao existe nos nossos dados.
function getDropPercent(product: any): number | null {
  const lowestPrice = product.lowest_price
  const discount = product.priceDrop ?? product.savings
  if (!discount || lowestPrice == null) return null
  return Math.round((discount.amount / (lowestPrice + discount.amount)) * 100)
}

// Mesmas especificacoes tecnicas da pagina /comparar (material, sola, fecho,
// cor) - vem diretamente das colunas reais da tabela products (nunca
// inventadas). Sem "Ref": esse campo e mais util na pagina /comparar, aqui
// so interessam os atributos que ajudam a decidir entre os 2 pares.
const SPEC_DEFS = [
  { key: 'material', label: 'Material' },
  { key: 'sole_type', label: 'Sola' },
  { key: 'closure_type', label: 'Fecho' },
  { key: 'color', label: 'Cor' },
] as const

// Mostra 2 produtos reais do catálogo (escolhidos em app/page.tsx) como
// prévia da funcionalidade de Comparar — nunca dados de exemplo inventados.
//
// Redesenho (3ª ronda, pedido do Jorge com novo mockup de referência dele
// próprio, no mesmo estilo do redesign v2 já aplicado no Hero da homepage -
// ver HomeHeroButtons.tsx):
// - Deixou de ser "texto fixo à esquerda + grelha de cartões à direita" e
//   passou a "bloco de intro (etiqueta/título/texto/botão) + foto grande
//   decorativa lado a lado no topo, tabela de comparação larga por baixo,
//   a ocupar a secção toda" - layout em 2 blocos empilhados, não em 2
//   colunas lado a lado como antes.
// - Foto grande decorativa: enviada pelo Jorge (pessoa com um ténis
//   diferente em cada pé, plano de cima) - só decorativa (não é nenhum dos
//   2 produtos comparados, para não sugerir que é um deles), tal como a
//   imagem "comparar-deco.png" que substitui.
// - Botão "Ir para o comparador" passou de preenchido a contornado (fundo
//   branco, contorno e texto pretos), a bater certo com o mockup.
// - A tabela de comparação (fotos, nome, preço, especificações) passou a
//   ocupar a largura toda da secção, com uma linha vertical fina a separar
//   os 2 produtos e o "vs" preto só junto às fotos (mesma posição de
//   sempre) - em vez de um bloco de cartões mais estreito ao lado do texto.
// - Secção alargada (max-w-5xl -> max-w-6xl) para dar espaço à tabela mais
//   larga sem espremer as fotos dos produtos.
// - Especificações: linhas com fundo branco e uma linha fina por cima de
//   cada uma (era um bloco com caixas cinza/branco alternadas) - mais
//   espaçado, a bater certo com o mockup.
export default function CompararPreview({ products }: { products: ProductWithPrice[] }) {
  if (products.length < 2) return null
  const [a, b] = products as any[]

  const cheapestPrices = [a, b]
    .map((p) => groupOffers(p.product_offers ?? [])[0]?.price ?? p.lowest_price ?? null)
    .filter((price): price is number => price != null)
  const cheapestPrice = cheapestPrices.length > 1 ? Math.min(...cheapestPrices) : null
  // Diferença entre os 2 preços, só quando temos os 2 (para o badge "Mais
  // barato" mostrar quanto se poupa, não só qual é mais barato).
  const priceDiff = cheapestPrices.length === 2 ? Math.abs(cheapestPrices[0] - cheapestPrices[1]) : null

  // So mostra uma linha de especificacao quando pelo menos um dos 2
  // produtos tem esse dado - e a mesma lista de linhas (pela mesma ordem)
  // que sai para os 2 cartoes, para as linhas ficarem sempre alinhadas
  // horizontalmente entre os dois, mesmo quando um deles nao tem o dado.
  const specRows = SPEC_DEFS.filter(({ key }) => a[key] || b[key])

  return (
    <section className="mb-16 sm:mb-20 max-w-6xl mx-auto rounded-none bg-[#f7f9f8] p-6 sm:p-10">
      {/* Bloco de topo: intro (esquerda) + foto grande decorativa (direita) */}
      <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-16">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Comparador</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
            Vê os ténis lado a lado.
          </h2>
          <p className="mt-3 max-w-md text-gray-500 leading-relaxed">
            Seleciona dois ténis e vê-os lado a lado, com preço, especificações e loja — sem abrir dez separadores.
          </p>
          <Link
            href="/comparar"
            className="mt-5 inline-flex w-fit items-center justify-center gap-1.5 rounded-none border border-gray-900 bg-white px-4 py-2 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-900 hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M8 3 4 7l4 4" />
              <path d="M4 7h16" />
              <path d="M16 21l4-4-4-4" />
              <path d="M20 17H4" />
            </svg>
            Ir para o comparador
          </Link>
        </div>
        {/* Foto decorativa enviada pelo Jorge - substitui a antiga
            comparar-deco.png. Não é nenhum dos 2 produtos comparados
            (aparecem só as fotos reais deles na tabela abaixo), é só para
            dar contexto visual à secção. */}
        <div className="w-full flex-shrink-0 sm:w-[320px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marketing/comparar-hero.jpg"
            alt=""
            aria-hidden="true"
            className="h-auto w-full rounded-none object-cover"
          />
        </div>
      </div>

      {/* Tabela de comparação: fotos, nome/preço e especificações dos 2
          produtos reais, lado a lado a toda a largura da secção. */}
      <div className="relative mt-10">
        {/* Linha vertical fina a separar os 2 produtos, da primeira foto até
            à última linha de especificações. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-gray-200 sm:block"
        />

        {/* Fotos dos 2 ténis, num grid a parte so para elas - o badge "vs"
            fica ancorado so a esta linha (nao ao cartao todo, texto e
            specs incluidos), para ficar mesmo junto as fotos e nao a
            flutuar a meio da tabela.
            Caixa cinza-clara à volta de cada foto, selo "-X%" no canto
            esquerdo (quando há descida de preço real) e o botão de
            favoritos real no canto direito, reaproveitando o mesmo padrão
            visual do cartão do catálogo (components/ProductCard.tsx). */}
        <div className="relative grid grid-cols-2 gap-x-6 sm:gap-x-10">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold uppercase text-white shadow-md ring-2 ring-white"
          >
            vs
          </span>
          {[a, b].map((product) => {
            // Só a primeira foto: isto é uma prévia, não a galeria completa
            // (essa fica para a página /comparar) - uma imagem estática fica
            // mais limpa aqui do que um carrossel com setas e pontos.
            const firstImage = product.image_url ?? product.image_urls?.[0] ?? null
            const dropPercent = getDropPercent(product)
            // Mesma regra de components/ProductCard.tsx: só mostrar o
            // selo a partir de 5% de desconto (abaixo disso é flutuação
            // normal de preço, não uma poupança real).
            const showDropBadge = dropPercent != null && dropPercent >= 5
            return (
              <div key={product.id} className="relative rounded-none bg-gray-100 p-2">
                <div className="absolute left-3 top-3 right-3 z-10 flex items-center justify-between">
                  {showDropBadge ? (
                    // Mesma cor de components/ProductCard.tsx: verde vivo
                    // (emerald-300) com texto emerald-950 para contraste.
                    <span className="rounded-none bg-emerald-300 px-2 py-1 text-xs font-bold text-emerald-950">
                      -{dropPercent}%
                    </span>
                  ) : (
                    <span />
                  )}
                  <FavoriteButton slug={product.slug} />
                </div>
                <ProductGallery
                  images={firstImage ? [firstImage] : []}
                  alt={product.model_name}
                  compact
                  imageBoxClassName="aspect-square"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>
            )
          })}
        </div>

        {/* Nome e preço: nome e preço passam a ser cada um a sua própria linha
            de grelha, partilhada pelas 2 colunas (mesma técnica das
            especificações mais abaixo). Sem isto, quando o nome de um
            produto ocupa 2 linhas e o do outro só 1, o preço ficava a
            alturas diferentes nas 2 colunas. */}
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:gap-x-10">
          {[a, b].map((product) => (
            <div key={`name-${product.id}`}>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{product.brands?.name}</p>
              <h3 className="mt-0.5 text-sm font-semibold text-gray-900">{product.model_name}</h3>
            </div>
          ))}
          {[a, b].map((product) => {
            const offers = groupOffers(product.product_offers ?? [])
            const lowestPrice = offers[0]?.price ?? product.lowest_price ?? null
            const isCheapest = cheapestPrice != null && lowestPrice === cheapestPrice

            return (
              <div key={`price-${product.id}`} className="flex flex-wrap items-center gap-1.5">
                {lowestPrice != null ? (
                  <>
                    <p className="text-lg font-extrabold text-gray-900">{formatPrice(lowestPrice)}</p>
                    {isCheapest && (
                      <span className="inline-flex items-center rounded-none bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        Mais barato{priceDiff ? ` · -${formatPrice(priceDiff)}` : ''}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Sem oferta disponível</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Especificações: uma linha por característica (Material, Sola,
            Fecho, Cor), cada uma com uma linha fina por cima a separá-la da
            anterior e a atravessar a divisória vertical entre os 2
            produtos - mesma técnica de grelha CSS a 2 colunas de sempre,
            para as linhas ficarem sempre à mesma altura nos 2 lados. */}
        {specRows.length > 0 && (
          <div className="mt-2">
            {specRows.map(({ key, label }) => (
              <div key={label} className="grid grid-cols-2 gap-x-6 border-t border-gray-200 sm:gap-x-10">
                <div className="py-3 pr-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-black">{label}</p>
                  <p className="mt-0.5 text-xs text-gray-700">{a[key] ?? '—'}</p>
                </div>
                <div className="py-3 pl-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-black">{label}</p>
                  <p className="mt-0.5 text-xs text-gray-700">{b[key] ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
