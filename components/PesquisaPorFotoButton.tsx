// components/PesquisaPorFotoButton.tsx
'use client'

import { openSearchModal } from '@/lib/searchModal'

// CTA da secção "Pesquisa por foto" da homepage - abre o mesmo modal
// unificado da lupa do cabeçalho (ver components/SearchModal.tsx).
export default function PesquisaPorFotoButton() {
  return (
    <button
      type="button"
      onClick={openSearchModal}
      className="inline-block bg-gray-900 text-white font-semibold text-sm rounded-full px-5 py-2.5 hover:bg-gray-800 transition-colors"
    >
      Experimenta a Pesquisa por Foto
    </button>
  )
}
