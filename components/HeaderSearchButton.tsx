// components/HeaderSearchButton.tsx
'use client'

import { openSearchModal } from '@/lib/searchModal'

// Abre a pesquisa compacta do cabeçalho (texto - ver HeaderSearchBar.tsx).
// Antes ficava escondido abaixo do breakpoint sm (hidden sm:flex), o que
// tirava a lupa por completo da navegação mobile; agora fica sempre visível,
// com uma área de toque de pelo menos 44x44px (recomendação de acessibilidade
// para alvos táteis).
export default function HeaderSearchButton() {
  return (
    <button
      type="button"
      onClick={openSearchModal}
      aria-label="Pesquisar"
      className="flex items-center justify-center min-h-[44px] min-w-[44px] text-gray-600 hover:text-orange-600 transition-colors"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
      </svg>
    </button>
  )
}
