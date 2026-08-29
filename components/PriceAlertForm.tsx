// components/PriceAlertForm.tsx
'use client'

import { useState, type FormEvent } from 'react'
import { createPriceAlert } from '@/app/produto/[slug]/priceAlertActions'

function BellIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

// Formulário "Avisa-me quando o preço descer" - fica fechado por defeito
// (só o botão) para não ocupar espaço na página do produto para quem não
// quer usar a funcionalidade.
export default function PriceAlertForm({
  productId,
  currentPrice,
}: {
  productId: string
  currentPrice: number | null
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const price = parseFloat(targetPrice.replace(',', '.'))
    setStatus('loading')

    const result = await createPriceAlert(productId, email, price)

    if (result.success) {
      setStatus('done')
      setMessage(
        result.alreadyConfirmed
          ? 'Alerta atualizado - já estava confirmado, não precisas de fazer mais nada.'
          : 'Falta um passo: enviámos um e-mail de confirmação, clica no link para ativares o alerta.'
      )
    } else {
      setStatus('error')
      setMessage(result.error)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
      >
        <BellIcon />
        Avisa-me quando o preço descer
      </button>
    )
  }

  if (status === 'done') {
    return <p className="mt-4 text-sm text-green-700 bg-green-50 rounded-xl p-3">{message}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
        <BellIcon />
        Avisa-me quando o preço descer
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          placeholder="o-teu-email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-0 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-gray-400"
        />
        <div className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 shrink-0">
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
      </div>

      {status === 'error' && <p className="text-xs text-red-600">{message}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? 'A criar...' : 'Criar alerta'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-600">
          Cancelar
        </button>
      </div>
    </form>
  )
}
