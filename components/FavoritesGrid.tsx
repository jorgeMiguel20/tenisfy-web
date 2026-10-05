// components/FavoritesGrid.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { productSelect } from '@/lib/productColumns'
import ProductCard from './ProductCard'
import { useFavorites } from '@/lib/favorites'
import { useAuth } from '@/lib/authBrowser'
import { computeSavingsFromRawOffers } from '@/lib/savings'
import type { Brand, Product, ProductWithPrice } from '@/lib/types'

// Aviso para quem não tem sessão iniciada: sem conta, os favoritos ficam
// só neste browser. Com sessão não aparece nada (já estão na conta).
function DeviceOnlyNote() {
  const auth = useAuth()
  if (auth.status !== 'signed-out') return null
  return (
    <p className="mb-6 text-sm text-[#5C6770]">
      Estes favoritos estão guardados só neste dispositivo.{' '}
      <Link
        href="/entrar?next=%2Ffavoritos"
        prefetch={false}
        className="font-medium text-[#17232B] underline underline-offset-4"
      >
        Entra
      </Link>{' '}
      para os teres também no telemóvel ou no computador.
    </p>
  )
}

type RawOffer = {
  price: number
  in_stock: boolean
  store_id: string
  size: string
  discontinued_at: string | null
  stores: { name: string; shipping_base_fee: number | null; shipping_free_threshold: number | null } | null
}
type RawProduct = Product & { brands: Brand; product_offers: RawOffer[] }

export default function FavoritesGrid() {
  const { favorites } = useFavorites()
  const [products, setProducts] = useState<ProductWithPrice[]>([])

  useEffect(() => {
    if (favorites.length === 0) return

    let cancelled = false

    supabase
      .from('products')
      .select(productSelect(`
        brands (*),
        product_offers (price, in_stock, store_id, size, discontinued_at, stores (name, shipping_base_fee, shipping_free_threshold))
      `))
      .in('slug', favorites)
      .then(({ data }: { data: RawProduct[] | null }) => {
        if (cancelled) return

        const withPrice = (data ?? []).map((p) => {
          // Ofertas descontinuadas (ver "Descontinuar oferta" em
          // /admin/precos) tratam-se como se não existissem.
          const activeOffers = p.product_offers.filter((o) => !o.discontinued_at)
          const inStockOffers = activeOffers.filter((o) => o.in_stock)
          const lowest_price = inStockOffers.length > 0
            ? Math.min(...inStockOffers.map((o) => o.price))
            : null
          const distinctStores = new Set(inStockOffers.map((o) => o.store_id))
          const sizes = Array.from(new Set(inStockOffers.map((o) => o.size)))
          const savings = computeSavingsFromRawOffers(activeOffers, p.brands?.name)
          return { ...p, lowest_price, store_count: distinctStores.size, sizes, savings }
        })

        // mantém a ordem em que foram adicionados aos favoritos
        const bySlug = new Map(withPrice.map((p) => [p.slug, p]))
        const ordered = favorites.map((slug) => bySlug.get(slug)).filter(Boolean) as unknown as ProductWithPrice[]
        setProducts(ordered)
      })

    return () => {
      cancelled = true
    }
  }, [favorites])

  if (favorites.length === 0) {
    return (
      // Sem a caixa grande à volta do "Ver catálogo" (parecia um produto
      // vazio - pedido de marketing): texto alinhado com o título e um
      // botão simples, igual aos outros do site.
      <div className="max-w-xl py-2">
        <DeviceOnlyNote />
        <p className="text-base text-[#17232B]">Ainda não tens favoritos.</p>
        <p className="mt-1 text-sm text-[#5C6770]">
          Carrega no coração de um ténis para o guardares aqui e voltares a ele mais tarde.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#17232B] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#17232B]/85"
        >
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <div>
      <DeviceOnlyNote />
      <p className="text-gray-500 text-sm mb-4">
        {products.length} produto{products.length !== 1 ? 's' : ''}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
