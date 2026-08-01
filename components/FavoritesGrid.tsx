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
      <div className="text-center py-16">
        <p className="text-gray-500">Ainda não tens produtos favoritos.</p>
        <p className="text-gray-400 text-sm mt-1">
          Clica no coração num produto para o guardares aqui neste dispositivo.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
