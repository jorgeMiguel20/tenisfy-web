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
      // Sem sombra (regra visual: nada de sombras). Em vez dela, uma linha
      // de 1px na cor única das linhas do site, para o círculo continuar
      // visível sobre fotos de fundo branco.
      className={`inline-flex items-center justify-center rounded-full border border-[#17232B]/10 bg-white/90 p-2 hover:bg-white transition-colors ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        // Mesma família de verde da marca (emerald) usada no resto do
        // rebranding (selo de desconto, "Como funciona", contadores da
        // barra) em vez do verde escuro #1F5F58 anterior (pedido do Jorge:
        // "aqui também"). Aqui usa-se emerald-600 (mais saturado) em vez do
        // emerald-300 dos selos, porque este ícone fica sobre um fundo
        // quase branco (bg-white/90) - o emerald-300, sendo um verde muito
        // claro, ficaria com pouco contraste e mal visível aqui.
        className={`h-4 w-4 transition-colors ${active ? 'text-emerald-600' : 'text-gray-400'}`}
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
