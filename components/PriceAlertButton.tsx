// components/PriceAlertButton.tsx
'use client'

import { useEffect, useId, useState, useSyncExternalStore, type FormEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { createPriceAlert } from '@/app/produto/[slug]/priceAlertActions'

function BellIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

// Só um modal de "Avisa-me quando descer" pode estar aberto de cada vez em
// toda a página (as grelhas têm muitos cards, cada um com o seu próprio
// botão) - store module-level simples fora do React, mais leve do que um
// Context a atravessar todas as grelhas/páginas que usam este botão.
let activeAlertId: string | null = null
const listeners = new Set<() => void>()

function setActiveAlert(id: string | null) {
  activeAlertId = id
  listeners.forEach((listener) => listener())
}

function subscribeActiveAlert(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Versão compacta do "Avisa-me quando o preço descer" (ver PriceAlertForm.tsx,
// na página do produto) para usar em cima dos cards da grelha/catálogo/
// favoritos. Fica fechado por defeito (só o sino) e abre um modal centrado
// com fundo escurecido, via portal para <body> - assim bloqueia mesmo o
// resto da página (incl. os cards vizinhos, que são <Link>) até o
// utilizador terminar ou cancelar, e nunca há mais que um aberto.
export default function PriceAlertButton({
  productId,
  currentPrice,
  className = '',
}: {
  productId: string
  currentPrice: number | null
  className?: string
}) {
  const id = useId()
  const activeId = useSyncExternalStore(subscribeActiveAlert, () => activeAlertId, () => null)
  const open = activeId === id

  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveAlert(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  function stopNav(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function close(e?: MouseEvent) {
    if (e) stopNav(e)
    setActiveAlert(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    const price = parseFloat(targetPrice.replace(',', '.'))
    setStatus('loading')

    const result = await createPriceAlert(productId, email, price)

    if (result.success) {
      setStatus('done')
      setMessage(
        result.alreadyConfirmed
          ? 'Alerta atualizado - já estava confirmado.'
          : 'Enviámos um e-mail de confirmação.'
      )
    } else {
      setStatus('error')
      setMessage(result.error)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          stopNav(e)
          setActiveAlert(open ? null : id)
        }}
        aria-pressed={open}
        aria-label="Avisa-me quando o preço descer"
        className={`inline-flex items-center justify-center rounded-full shadow-sm p-2 transition-colors ${
          open ? 'bg-gray-900' : 'bg-white/90 hover:bg-white'
        }`}
      >
        <BellIcon className={`h-4 w-4 ${open ? 'text-white' : 'text-gray-400'}`} />
      </button>

      {mounted && open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div onClick={stopNav} className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl">
            {status === 'done' ? (
              <>
                <p className="text-sm text-green-700">{message}</p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-3 w-full bg-gray-900 text-white px-3 py-2 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <BellIcon className="h-4 w-4 text-gray-400" />
                  Avisa-me quando descer
                </p>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="o-teu-email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                />
                <div className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2">
                  <span className="text-sm text-gray-400 whitespace-nowrap">abaixo de</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder={currentPrice != null ? String(Math.max(1, Math.round(currentPrice * 0.9))) : '50'}
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-14 text-sm outline-none"
                  />
                  <span className="text-sm text-gray-400">€</span>
                </div>

                {status === 'error' && <p className="text-xs text-red-600">{message}</p>}

                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="flex-1 bg-gray-900 text-white px-3 py-2 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {status === 'loading' ? 'A criar...' : 'Criar alerta'}
                  </button>
                  <button type="button" onClick={close} className="text-sm text-gray-400 hover:text-gray-600">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
