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
export default function CompararPreview({ products }: { products: ProductWithPrice[] }) {
  if (products.length < 2) return null
  const [a, b] = products as any[]

  const cheapestPrices = [a, b]
    .map((p) => groupOffers(p.product_offers ?? [])[0]?.price ?? p.lowest_price ?? null)
    .filter((price): price is number => price != null)
  const cheapestPrice = cheapestPrices.length > 1 ? Math.min(...cheapestPrices) : null

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
    <section className="mb-12">
      <div className="mb-6 max-w-xl">
        {/* orange-700 em vez de orange-600 neste texto pequeno e a negrito:
            orange-600 sobre branco fica perto de 3.6:1, abaixo do mínimo de
            4.5:1 (WCAG AA) para texto normal - orange-700 já passa. */}
        <span className="text-orange-700 text-xs font-bold uppercase tracking-wide">Comparar</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mt-2 mb-3">Vê os ténis lado a lado</h2>
        <p className="text-gray-500">
          Seleciona dois ténis e vê-os lado a lado, com preço, especificações e loja — sem abrir dez separadores.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {[a, b].map((product) => {
          const offers = groupOffers(product.product_offers ?? [])
          const lowestPrice = offers[0]?.price ?? product.lowest_price ?? null
          const isCheapest = cheapestPrice != null && lowestPrice === cheapestPrice

          return (
            <div
              key={product.id}
              className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <ProductGallery
                images={product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []}
                alt={product.model_name}
                compact
                imageBoxClassName="aspect-square"
                sizes="(max-width: 768px) 100vw, 50vw"
              />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{product.brands?.name}</p>
                <h3 className="font-semibold text-gray-900 mt-0.5">{product.model_name}</h3>
              </div>

              {lowestPrice != null ? (
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-extrabold text-orange-600">{formatPrice(lowestPrice)}</p>
                  {isCheapest && (
                    <span className="inline-flex items-center bg-green-50 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      Mais barato
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Sem oferta disponível</p>
              )}

              {specRows.length > 0 && (
                <div className="space-y-1.5 text-sm">
                  {specRows.map(({ key, label }) => {
                    const value = product[key]
                    const isDifferent = differingLabels.has(label)
                    return (
                      <p
                        key={label}
                        className={isDifferent ? '-mx-2 rounded-md bg-orange-50 px-2 py-1' : ''}
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

      <div className="mt-6">
        <Link
          href="/comparar"
          className="inline-block bg-gray-900 text-white font-semibold text-sm rounded-full px-5 py-2.5 hover:bg-gray-800 transition-colors"
        >
          Ir para o Comparar
        </Link>
      </div>
    </section>
  )
}
