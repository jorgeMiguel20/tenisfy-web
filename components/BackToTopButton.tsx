// components/BackToTopButton.tsx
'use client'

import { useEffect, useState } from 'react'

// Botão "Ir para o topo" do catálogo (pedido do Jorge, inspirado no da
// Zalando): o catálogo vai carregando ténis à medida que se desce, por isso
// a página fica muito comprida - este botão leva de volta ao topo (aos
// filtros) com um clique. Só aparece depois de se descer um bocado.
//
// No telemóvel fica mais acima (bottom-20) para não ficar por cima da barra
// "N produtos selecionados" do Comparar, que aparece no fundo do ecrã.
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
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-[#17232B] px-4 py-3 text-[13px] font-bold uppercase tracking-[0.04em] text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#123F3A] sm:bottom-6 sm:right-6"
    >
      Ir para o topo
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  )
}
