// app/admin/precos/PriceCheckButton.tsx
'use client'

import { useState } from 'react'
import { markPricesVerified } from './actions'

export default function PriceCheckButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleClick() {
    setStatus('loading')
    const result = await markPricesVerified()

    if (result.success) {
      const formatted = new Date(result.timestamp).toLocaleString('pt-PT', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
      setMessage(`Preços marcados como verificados em ${formatted} (${result.count} ofertas atualizadas).`)
      setStatus('success')
    } else {
      setMessage(`Erro: ${result.error}`)
      setStatus('error')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'loading'}
        className="bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? 'A marcar...' : 'Marcar preços como verificados hoje'}
      </button>

      {message && (
        <p className={`mt-4 text-sm ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
