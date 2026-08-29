// components/HeroSearchBar.tsx
'use client'

import Link from 'next/link'
import HeroPhotoSearchButton from './HeroPhotoSearchButton'
import { useSearchModalOpen } from '@/lib/searchModal'

// Chips de sugestão: apontam para /catalogo?q=..., que o ProductGrid já lê
// como pesquisa inicial (ver o parâmetro "q" sincronizado em ProductGrid.tsx).
const SUGGESTIONS = ['Air Force 1', 'Samba', 'New Balance 550']

// A barra de pesquisa "completa" (com sugestões) vive só aqui no Hero -
// ver components/HeaderSearchBar.tsx para a versão compacta do cabeçalho.
// Quando a pesquisa do cabeçalho está aberta (lupa clicada, ou o próprio
// ícone de câmara abaixo, que usa o mesmo estado partilhado), esta barra
// esconde-se para nunca haver duas pesquisas visíveis ao mesmo tempo na
// página.
export default function HeroSearchBar() {
  const headerSearchOpen = useSearchModalOpen()

  if (headerSearchOpen) return null

  return (
    <>
      {/* Pesquisa real: formulário GET simples, sem precisar de JS — a
          página /catalogo já lê ?q= (ver ProductGrid.tsx) e aplica-o à
          grelha. */}
      <form
        action="/catalogo"
        method="get"
        className="mt-6 flex items-center gap-2 bg-white rounded-full p-1.5 pl-5 shadow-lg max-w-md"
      >
        <input
          type="text"
          name="q"
          placeholder="Pesquisa por modelo, marca ou foto..."
          className="flex-1 min-w-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
        />
        <HeroPhotoSearchButton />
        <button
          type="submit"
          aria-label="Pesquisar"
          className="w-10 h-10 rounded-full bg-orange-600 hover:bg-orange-700 transition-colors flex items-center justify-center text-white shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2 max-w-md">
        {SUGGESTIONS.map((term) => (
          <Link
            key={term}
            href={`/catalogo?q=${encodeURIComponent(term)}`}
            className="text-xs font-semibold bg-white/90 hover:bg-white text-gray-700 rounded-full px-3 py-1.5 transition-colors"
          >
            {term}
          </Link>
        ))}
      </div>
    </>
  )
}
