// components/FavoritesNavLink.tsx
'use client'

import Link from 'next/link'
import { useFavorites } from '@/lib/favorites'

export default function FavoritesNavLink() {
  const { favorites } = useFavorites()
  const count = favorites.length

  return (
    <Link
      href="/favoritos"
      className="ml-auto flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
    >
      Favoritos
      {count > 0 && (
        <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-orange-600 text-white text-[11px] font-semibold">
          {count}
        </span>
      )}
    </Link>
  )
}
