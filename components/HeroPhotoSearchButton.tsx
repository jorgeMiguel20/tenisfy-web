// components/HeroPhotoSearchButton.tsx
'use client'

import { openSearchModal } from '@/lib/searchModal'

// Ícone de câmara da barra de pesquisa do Hero - abre o mesmo modal
// unificado da lupa do cabeçalho (ver components/SearchModal.tsx) em vez
// de levar para /catalogo, já que o botão que lá estava foi removido.
export default function HeroPhotoSearchButton() {
  return (
    <button
      type="button"
      onClick={openSearchModal}
      aria-label="Pesquisar por foto"
      className="w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors flex items-center justify-center text-white shrink-0"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <circle cx="12" cy="13" r="3" />
      </svg>
    </button>
  )
}
