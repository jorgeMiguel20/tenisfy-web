// components/HeaderSearchButton.tsx
'use client'

import { openSearchModal } from '@/lib/searchModal'

// Abre o modal unificado de pesquisa (texto ou foto) em vez de ir direto
// para /catalogo - ver components/SearchModal.tsx.
export default function HeaderSearchButton() {
  return (
    <button
      type="button"
      onClick={openSearchModal}
      aria-label="Pesquisar"
      className="hidden sm:flex text-gray-600 hover:text-orange-600 transition-colors"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
      </svg>
    </button>
  )
}
