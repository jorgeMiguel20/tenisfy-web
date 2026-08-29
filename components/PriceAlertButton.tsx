// components/PriceAlertButton.tsx
'use client'

import { useState, type FormEvent, type MouseEvent } from 'react'
import { createPriceAlert } from '@/app/produto/[slug]/priceAlertActions'

function BellIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

// Versão compacta do "Avisa-me quando o preço descer" (ver PriceAlertForm.tsx,
// na página do produto) para usar em cima dos cards da grelha/catálogo/
// favoritos. Fica fechado por defeito (só o sino) e abre um popup ali mesmo
// no card, sem navegar para a página do produto - por isso todo o clique
// aqui (incluindo dentro do formulário) precisa de parar a propagação, já
// que o card inteiro é um <Link>.
export default function PriceAlertButton({
  productId,
  currentPrice,
  className = '',
}: {
  productId: string
  currentPrice: number | null
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  function stopNav(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
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
          setOpen((o) => !o)
        }}
        aria-pressed={open}
        aria-label="Avisa-me quando o preço descer"
        className={`inline-flex items-center justify-center rounded-full shadow-sm p-2 transition-colors ${
          open ? 'bg-gray-900' : 'bg-white/90 hover:bg-white'
        }`}
      >
        <BellIcon className={`h-4 w-4 ${open ? 'text-white' : 'text-gray-400'}`} />
      </button>

      {open && (
        <div
          onClick={stopNav}
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-100 bg-white p-3 shadow-lg z-20"
        >
          {status === 'done' ? (
            <p className="text-xs text-green-700">{message}</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                <BellIcon className="h-3.5 w-3.5 text-gray-400" />
                Avisa-me quando descer
              </p>
              <input
                type="email"
                required
                placeholder="o-teu-email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onClick={stopNav}
                className="w-full rounded-full border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-gray-400"
              />
              <div className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5">
                <span className="text-xs text-gray-400 whitespace-nowrap">abaixo de</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder={currentPrice != null ? String(Math.max(1, Math.round(currentPrice * 0.9))) : '50'}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  onClick={stopNav}
                  className="w-12 text-xs outline-none"
                />
                <span className="text-xs text-gray-400">€</span>
              </div>

              {status === 'error' && <p className="text-[11px] text-red-600">{message}</p>}

              <div className="flex items-center gap-2 mt-0.5">
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="flex-1 bg-gray-900 text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {status === 'loading' ? 'A criar...' : 'Criar alerta'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    stopNav(e)
                    setOpen(false)
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
