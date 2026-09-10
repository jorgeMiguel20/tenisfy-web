// components/CompararPreview.tsx
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'
import ProductGallery from '@/components/ProductGallery'

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
// Layout em 2 colunas: bloco de texto/CTA fixo à esquerda, grelha de
// comparação (2 cartões) à direita - pedido explícito do Jorge com imagem
// de referência.
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

  // Specs cujo valor difere entre os 2 produtos (para destacar com fundo
  // suave) - mesma logica de app/comparar/page.tsx.
  const differingLabels = new Set(
    specRows
      .filter(({ key }) => {
        const values = [a, b].map((p) => p[key]).filter(Boolean)
        return new Set(values).size > 1
      })
      .map(({ label }) => label)
  )

  return (
    <section className="mb-16 sm:mb-20 max-w-3xl mx-auto">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* Coluna esquerda: etiqueta, titulo, texto e CTA - fixa, nao encolhe */}
        <div className="flex w-full flex-shrink-0 flex-col gap-2.5 sm:w-52">
          <span className="w-fit rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-normal uppercase tracking-wide text-white">
            Comparar
          </span>
          <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">Vê os ténis lado a lado</h2>
          <p className="text-sm leading-relaxed text-gray-500">
            Seleciona dois ténis e vê-os lado a lado, com preço, especificações e loja — sem abrir dez separadores.
          </p>
          <Link
            href="/comparar"
            className="mt-1 inline-flex w-fit items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Ir para o Comparar
          </Link>
        </div>

        {/* Coluna direita: grelha de comparacao com os 2 cartoes */}
        <div className="grid flex-1 grid-cols-2 gap-4">
          {[a, b].map((product) => {
            const offers = groupOffers(product.product_offers ?? [])
            const lowestPrice = offers[0]?.price ?? product.lowest_price ?? null
            const isCheapest = cheapestPrice != null && lowestPrice === cheapestPrice

            // Só a primeira foto: isto é uma prévia, não a galeria completa
            // (essa fica para a página /comparar) - uma imagem estática fica
            // mais limpa aqui do que um carrossel com setas e pontos.
            const firstImage = product.image_url ?? product.image_urls?.[0] ?? null

            return (
              <div key={product.id} className="flex flex-col gap-2">
                <ProductGallery
                  images={firstImage ? [firstImage] : []}
                  alt={product.model_name}
                  compact
                  imageBoxClassName="aspect-[3/2]"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />

                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{product.brands?.name}</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-gray-900">{product.model_name}</h3>
                </div>

                {lowestPrice != null ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-lg font-extrabold text-orange-600">{formatPrice(lowestPrice)}</p>
                    {isCheapest && (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        Mais barato{priceDiff ? ` · -${formatPrice(priceDiff)}` : ''}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Sem oferta disponível</p>
                )}

                {specRows.length > 0 && (
                  <div className="mt-0.5 space-y-1 text-xs">
                    {specRows.map(({ key, label }) => {
                      const value = product[key]
                      const isDifferent = differingLabels.has(label)
                      return (
                        <p
                          key={label}
                          className={isDifferent ? 'rounded-md bg-orange-50 px-1.5 py-1' : 'px-1.5 py-1'}
                        >
                          <span className={isDifferent ? 'font-semibold text-gray-900' : 'font-semibold text-gray-700'}>
                            {label}:
                          </span>{' '}
                          <span className={isDifferent ? 'font-medium text-gray-800' : 'text-gray-600'}>
                            {value ?? '—'}
                          </span>
                        </p>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
