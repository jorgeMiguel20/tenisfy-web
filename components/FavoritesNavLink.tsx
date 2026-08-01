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
      aria-label="Favoritos"
      className="ml-auto flex shrink-0 items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
    >
      {/* Mobile: só o ícone (a barra não tem largura para "Favoritos" + contador
          ao lado de Homem/Mulher/Crianças sem forçar scroll horizontal).
          A partir de sm, mostra o texto normalmente. */}
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 sm:hidden"
        fill={count > 0 ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21s-6.716-4.35-9.428-8.06C.85 10.1 1.2 6.6 4.1 5.02 6.4 3.77 9 4.5 12 7.5c3-3 5.6-3.73 7.9-2.48 2.9 1.58 3.25 5.08 1.53 7.92C18.716 16.65 12 21 12 21z"
        />
      </svg>
      <span className="hidden sm:inline">Favoritos</span>
      {count > 0 && (
        <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-orange-600 text-white text-[11px] font-semibold">
          {count}
        </span>
      )}
    </Link>
  )
}
