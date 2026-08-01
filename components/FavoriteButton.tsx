// components/FavoriteButton.tsx
'use client'

import { useFavorites } from '@/lib/favorites'

export default function FavoriteButton({
  slug,
  className = '',
}: {
  slug: string
  className?: string
}) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const active = isFavorite(slug)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite(slug)
      }}
      aria-pressed={active}
      aria-label={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`inline-flex items-center justify-center rounded-full bg-white/90 shadow-sm p-2 hover:bg-white transition-colors ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 transition-colors ${active ? 'text-orange-600' : 'text-gray-400'}`}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21s-6.716-4.35-9.428-8.06C.85 10.1 1.2 6.6 4.1 5.02 6.4 3.77 9 4.5 12 7.5c3-3 5.6-3.73 7.9-2.48 2.9 1.58 3.25 5.08 1.53 7.92C18.716 16.65 12 21 12 21z"
        />
      </svg>
    </button>
  )
}
