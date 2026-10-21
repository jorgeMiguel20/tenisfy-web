// components/BackToTopButton.tsx
'use client'

import { useEffect, useState } from 'react'

// Botão "Ir para o topo" do catálogo (pedido do Jorge, inspirado no da
// Zalando): o catálogo vai carregando ténis à medida que se desce, por isso
// a página fica muito comprida - este botão leva de volta ao topo (aos
// filtros) com um clique. Só aparece depois de se descer um bocado.
//
// No telemóvel é só um círculo pequeno com a seta (pedido do Jorge,
// 2026-10-21) para não tapar os cartões nem os botões "Comparar"; fica mais
// acima (bottom-20) para não ficar por cima da barra "N produtos
// selecionados" do Comparar. No computador mantém o texto "Ir para o topo".
export default function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function update() {
      setVisible(window.scrollY > 800)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      aria-label="Ir para o topo"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#17232B] text-[13px] font-bold uppercase tracking-[0.04em] text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#123F3A] sm:bottom-6 sm:right-6 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3"
    >
      <span className="hidden sm:inline">Ir para o topo</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true" className="sm:h-3.5 sm:w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  )
}
