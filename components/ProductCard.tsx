// components/ProductCard.tsx
import Link from 'next/link'
import type { ProductWithPrice } from '@/lib/types'

export default function ProductCard({ product }: { product: ProductWithPrice }) {
  const lowestPrice = product.lowest_price
  const storeCount = product.store_count ?? 0

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-gray-100 rounded mb-3 overflow-hidden">
        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.model_name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <p className="text-sm text-gray-500">{product.brands?.name}</p>
      <p className="font-semibold my-1">{product.model_name}</p>
      {lowestPrice ? (
        <p>
          Desde <strong>{lowestPrice.toFixed(2)}€</strong>
          {storeCount > 1 && (
            <span className="text-gray-500 text-sm"> · {storeCount} lojas</span>
          )}
        </p>
      ) : (
        <p className="text-gray-400">Sem oferta disponível</p>
      )}
    </Link>
  )
}