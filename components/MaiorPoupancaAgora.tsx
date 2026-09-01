// components/MaiorPoupancaAgora.tsx
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'

// Grelha de 4 produtos reais com a maior descida de preço atual (o mesmo
// critério de "Descidas de preço recentes", só que reduzido às 4 maiores,
// sempre pares de adulto - ver app/page.tsx - e com o layout de destaque do
// mockup) - nunca percentagens ou produtos inventados, sempre a partir de
// product_offers/price_history reais (ver lib/priceDrop.ts).
export default function MaiorPoupancaAgora({ products }: { products: ProductWithPrice[] }) {
  if (products.length === 0) return null

  return (
    <section id="promocoes" className="mb-12 pt-4">
      <div className="mb-5">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-900">
          Baixou de preço esta semana
        </span>
        <h2 className="font-display text-2xl font-bold text-gray-900 mt-1">Maior poupança agora</h2>
      </div>

      {/* sm: 2 colunas (em vez de saltar logo para o layout final a 640px) e
          lg: 4 colunas - para tablets no intervalo 640-1024px não ficarem
          com 4 cards apertados numa só linha nem 1 card esticado por linha. */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((product) => {
          const drop = product.priceDrop!
          const currentPrice = product.lowest_price!
          const previousPrice = Math.round((currentPrice + drop.amount) * 100) / 100
          const percentOff = Math.round((drop.amount / previousPrice) * 100)
          const sizeNumbers = product.sizes
            .map((s) => parseFloat(s))
            .filter((n) => !Number.isNaN(n))
            .sort((a, b) => a - b)
          const sizeRange =
            sizeNumbers.length > 0
              ? `Tamanhos ${sizeNumbers[0]}–${sizeNumbers[sizeNumbers.length - 1]} disponíveis`
              : null

          return (
            <Link
              key={product.id}
              href={`/produto/${product.slug}`}
              className="block rounded-2xl border border-gray-100 p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_8px_20px_rgba(17,24,39,0.06)] hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <div className="aspect-square bg-gray-50 rounded-xl mb-4 overflow-hidden">
                {product.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.model_name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {product.brands?.name}
                {product.store_count ? ` · ${product.store_count} ${product.store_count === 1 ? 'loja' : 'lojas'}` : ''}
              </p>
              <h3 className="font-semibold text-gray-900 mt-0.5 mb-1">{product.model_name}</h3>
              {sizeRange && <p className="text-xs text-gray-400 mb-3">{sizeRange}</p>}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center bg-green-50 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  -{percentOff}%
                </span>
                <span className="text-gray-400 line-through text-sm">{formatPrice(previousPrice)}</span>
              </div>
              <p className="text-xl font-extrabold text-orange-600 mt-0.5">{formatPrice(currentPrice)}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
