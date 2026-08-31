'use client'

import ProductCard from './ProductCard'
import type { ProductWithPrice } from '@/lib/types'
import { useCompare } from '@/lib/compare'

export default function RecentDropsGrid({ products }: { products: ProductWithPrice[] }) {
  const { compareSlugs, toggleCompare } = useCompare()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isSelected={compareSlugs.includes(product.slug)}
          onToggleCompare={(p) => toggleCompare(p.slug)}
        />
      ))}
    </div>
  )
}
