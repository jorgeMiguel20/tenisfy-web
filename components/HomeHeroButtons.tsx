// components/HomeHeroButtons.tsx
'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { setPendingImageFile } from '@/lib/searchModal'

// Botoes de acao do Hero (redesign v2 que o Jorge preparou no Claude
// Design), substituindo a barra de pesquisa inline - a pesquisa por texto
// continua acessivel pelo icone de pesquisa no cabecalho (ver
// components/Header.tsx / HeaderSearchBar.tsx), so deixou de estar tambem
// aqui no Hero. O botao "Pesquisar por foto" usa a mesma ligacao direta ao
// input de ficheiro + lib/searchModal.ts que ja existe em
// PesquisaPorFotoButton.tsx, duplicada aqui de proposito (mesmo padrao ja
// usado em components/DiferencaPrecos.tsx) para este botao nao depender
// daquele componente.
export default function HomeHeroButtons() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingImageFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Link
        href="/catalogo"
        prefetch={false}
        className="inline-block rounded-lg bg-white text-gray-900 font-semibold text-sm px-5 py-3 hover:bg-gray-100 transition-colors"
      >
        Explorar catálogo
      </Link>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-lg border border-white/40 text-white font-semibold text-sm px-5 py-3 hover:bg-white/10 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
        Pesquisar por foto
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="sr-only"
      />
    </div>
  )
}
