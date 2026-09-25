// components/FilterDrawer.tsx
'use client'

import { useEffect, useRef } from 'react'

// Painel "Filtrar & Ordenar" do catálogo (aberto pelo botão "Filtros" em
// components/ProductGrid.tsx).
// - Telemóvel: sobe de baixo e ocupa até 85% da altura do ecrã.
// - A partir de sm (tablet/computador): painel à direita, com a altura toda
//   do ecrã, como na Nike e na BSTN - antes era uma "gaveta" de baixo
//   também no computador, estreita e centrada, que parecia de telemóvel.
// Fecha com o X, a tecla Esc ou um clique fora do painel. Regras visuais do
// site: cantos retos, sem sombras, linhas de 1px em #17232B/10.
export default function FilterDrawer({
  open,
  onClose,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  // onClose guardado num ref: o ProductGrid passa uma função nova a cada
  // render, e se o efeito abaixo dependesse dela voltava a correr (e a pôr
  // o foco no X) sempre que se escreve no preço ou se escolhe um filtro.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    // Foco no botão de fechar ao abrir (teclado e leitores de ecrã começam
    // dentro do painel, não na página por trás).
    closeRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-[#17232B]/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        className="filter-panel absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-none bg-white sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[420px]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#17232B]/10 py-2 pl-5 pr-2">
          <h2 id="filter-drawer-title" className="text-base font-semibold text-[#17232B]">
            Filtrar &amp; Ordenar
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-11 w-11 items-center justify-center text-[#5C6770] transition-colors hover:text-[#17232B]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5">{children}</div>

        {footer && <div className="shrink-0 border-t border-[#17232B]/10 p-4">{footer}</div>}
      </div>
    </div>
  )
}
