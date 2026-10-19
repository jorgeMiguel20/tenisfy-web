// components/BrandProductGrid.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import ProductCard from './ProductCard'
import type { ProductWithPrice } from '@/lib/types'

// Grelha da página de cada marca (/marcas/nike, /marcas/adidas, ...).
// Algumas marcas têm milhares de ténis (importação automática das lojas
// afiliadas): desenhar todos de uma vez tornava a página enorme e lenta.
// Tal como no catálogo, aparecem 48 e, quando se chega perto do fim,
// aparecem automaticamente os 48 seguintes (sem botão "Ver mais").
// O aspeto dos cartões e da grelha é o mesmo de sempre.
const PAGE_SIZE = 48

export default function BrandProductGrid({ products }: { products: ProductWithPrice[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const hasMore = visibleCount < products.length

  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + PAGE_SIZE)
        }
      },
      { rootMargin: '0px 0px 1000px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, visibleCount])

  return (
    <>
      <div className="mt-10 grid grid-cols-2 border-l border-t border-[#17232B]/10 sm:grid-cols-3 xl:grid-cols-4">
        {products.slice(0, visibleCount).map((product) => (
          <ProductCard key={product.id} product={product} inGrid />
        ))}
      </div>
      {hasMore && <div ref={loadMoreRef} aria-hidden="true" className="h-px w-full" />}
    </>
  )
}
