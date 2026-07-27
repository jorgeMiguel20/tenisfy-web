// components/FilterDrawer.tsx
'use client'

import { useEffect } from 'react'

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
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl sm:max-w-md sm:mx-auto sm:left-0 sm:right-0 animate-slide-up flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Filtrar &amp; Ordenar</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto">{children}</div>

        {footer && <div className="shrink-0 border-t border-gray-100 p-4">{footer}</div>}
      </div>
    </div>
  )
}
