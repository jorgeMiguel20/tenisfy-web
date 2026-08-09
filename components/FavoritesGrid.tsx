// components/FavoritesGrid.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProductCard from './ProductCard'
import { useFavorites } from '@/lib/favorites'
import type { Brand, Product, ProductWithPrice } from '@/lib/types'

type RawOffer = { price: number; in_stock: boolean; store_id: string; size: string }
type RawProduct = Product & { brands: Brand; product_offers: RawOffer[] }

export default function FavoritesGrid() {
  const { favorites } = useFavorites()
  const [products, setProducts] = useState<ProductWithPrice[]>([])

  useEffect(() => {
    if (favorites.length === 0) return

    let cancelled = false

    supabase
      .from('products')
      .select(`
        *,
        brands (*),
        product_offers (price, in_stock, store_id, size)
      `)
      .in('slug', favorites)
      .then(({ data }: { data: RawProduct[] | null }) => {
        if (cancelled) return

        const withPrice = (data ?? []).map((p) => {
          const inStockOffers = p.product_offers.filter((o) => o.in_stock)
          const lowest_price = inStockOffers.length > 0
            ? Math.min(...inStockOffers.map((o) => o.price))
            : null
          const distinctStores = new Set(inStockOffers.map((o) => o.store_id))
          const sizes = Array.from(new Set(inStockOffers.map((o) => o.size)))
          return { ...p, lowest_price, store_count: distinctStores.size, sizes }
        })

        // mantém a ordem em que foram adicionados aos favoritos
        const bySlug = new Map(withPrice.map((p) => [p.slug, p]))
        const ordered = favorites.map((slug) => bySlug.get(slug)).filter(Boolean) as ProductWithPrice[]
        setProducts(ordered)
      })

    return () => {
      cancelled = true
    }
  }, [favorites])

  if (favorites.length === 0) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-6">
          Ainda sem favoritos. Clica no coração num produto para o guardares aqui.
        </p>
        <Link
          href="/"
          className="flex max-w-xs flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21s-6.716-4.35-9.428-8.06C.85 10.1 1.2 6.6 4.1 5.02 6.4 3.77 9 4.5 12 7.5c3-3 5.6-3.73 7.9-2.48 2.9 1.58 3.25 5.08 1.53 7.92C18.716 16.65 12 21 12 21z"
            />
          </svg>
          <span className="text-sm font-semibold">Ver catálogo</span>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <p className="text-gray-500 text-sm mb-4">
        {products.length} produto{products.length !== 1 ? 's' : ''}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
