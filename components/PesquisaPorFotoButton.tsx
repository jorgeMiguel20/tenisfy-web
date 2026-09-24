// components/PesquisaPorFotoButton.tsx
'use client'

import { useRef } from 'react'
import { setPendingImageFile } from '@/lib/searchModal'

// CTA da secção "Pesquisa por foto" da homepage. Tem o seu próprio input de
// ficheiro, sempre montado (nunca escondido com display:none - em vários
// browsers móveis isso impede o seletor nativo de abrir por .click()
// programático) e acionado diretamente aqui mesmo, dentro do próprio toque
// do utilizador - tal como o ícone de câmara do Hero (ver
// HeroPhotoSearchButton.tsx). Depois de escolhida a foto, entrega-a ao
// modal unificado de pesquisa do cabeçalho (HeaderSearchBar.tsx) via
// lib/searchModal.ts, que a processa assim que abre - sem depender de o
// cabeçalho já estar montado em modo pesquisa nesse preciso instante.
export default function PesquisaPorFotoButton() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingImageFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        // Mesmo botão das outras secções da homepage (comparador e alerta
        // de preço): verde #123F3A, cantos retos, 44px de altura e ícone de
        // traço fino à esquerda.
        className="inline-flex min-h-[44px] items-center gap-2 rounded-none bg-[#123F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        Experimenta a pesquisa por foto
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="sr-only"
      />
    </>
  )
}
