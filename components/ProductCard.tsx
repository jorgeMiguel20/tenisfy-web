// components/ProductCard.tsx
import Link from 'next/link'
import type { ProductWithPrice } from '@/lib/types'

type ProductCardProps = {
  product: ProductWithPrice
  isSelected?: boolean
  onToggleCompare?: (product: ProductWithPrice) => void
}

export default function ProductCard({ product, isSelected = false, onToggleCompare }: ProductCardProps) {
  const lowestPrice = product.lowest_price
  const storeCount = product.store_count ?? 0

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group relative block rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-lg hover:-translate-y-1"
    >
      {onToggleCompare && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleCompare(product)
          }}
          aria-pressed={isSelected}
          className={`absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors ${
            isSelected
              ? 'bg-gray-900 text-white'
              : 'bg-white/90 text-gray-600 hover:bg-white'
          }`}
        >
          {isSelected ? (
            <>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Selecionado
            </>
          ) : (
            'Comparar'
          )}
        </button>
      )}

      <div className="aspect-square bg-gray-50 rounded-xl mb-4 overflow-hidden">
        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.model_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {product.brands?.name}
      </p>
      <p className="font-semibold text-gray-900 mt-0.5 mb-2">{product.model_name}</p>
      {lowestPrice ? (
        <div>
          {storeCount > 1 && (
            <span className="inline-flex items-center bg-green-50 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1.5">
              Melhor preço
            </span>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-orange-600">
              {lowestPrice.toFixed(2)}€
            </span>
            {storeCount > 1 && (
              <span className="text-xs text-gray-400">· {storeCount} lojas</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Sem oferta disponível</p>
      )}
    </Link>
  )
}