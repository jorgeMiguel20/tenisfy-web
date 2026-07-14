// components/ProductGrid.tsx
'use client'

import { useMemo, useState } from 'react'
import ProductCard from './ProductCard'
import type { ProductWithPrice } from '@/lib/types'

export default function ProductGrid({ products }: { products: ProductWithPrice[] }) {
  const [selectedBrand, setSelectedBrand] = useState<string>('Todos')

  const brands = useMemo(() => {
    const uniqueBrands = Array.from(
      new Set(products.map((p) => p.brands?.name).filter(Boolean))
    ) as string[]
    return ['Todos', ...uniqueBrands]
  }, [products])

  const filteredProducts = useMemo(() => {
    if (selectedBrand === 'Todos') return products
    return products.filter((p) => p.brands?.name === selectedBrand)
  }, [products, selectedBrand])

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8">
        {brands.map((brand) => (
          <button
            key={brand}
            onClick={() => setSelectedBrand(brand)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedBrand === brand
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {brand}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <p className="text-gray-400">Nenhum produto encontrado para esta marca.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}