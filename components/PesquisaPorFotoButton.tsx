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
        className="inline-block bg-gray-900 text-white font-semibold text-sm rounded-full px-5 py-2.5 hover:bg-gray-800 transition-colors"
      >
        Experimenta a Pesquisa por Foto
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
