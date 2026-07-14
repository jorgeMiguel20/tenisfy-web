// components/ProductCard.tsx
import Link from 'next/link'
import type { ProductWithPrice } from '@/lib/types'

export default function ProductCard({ product }: { product: ProductWithPrice }) {
  const lowestPrice = product.lowest_price
  const storeCount = product.store_count ?? 0

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group block rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-gray-200 hover:shadow-lg hover:-translate-y-0.5"
    >
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
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-orange-600">
            {lowestPrice.toFixed(2)}€
          </span>
          {storeCount > 1 && (
            <span className="text-xs text-gray-400">· {storeCount} lojas</span>
          )}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Sem oferta disponível</p>
      )}
    </Link>
  )
}