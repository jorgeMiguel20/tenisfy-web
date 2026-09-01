// app/admin/precos/NewSizesSection.tsx
'use client'

import { useState, useTransition } from 'react'
import { formatPrice } from '@/lib/formatPrice'
import { approveNewSizes, rejectNewSize } from './newSizeActions'

export type NewSizeRow = {
  id: string
  productName: string
  storeName: string
  size: string
  price: number | null
  inStock: boolean | null
  url: string
}

function PriceCell({ price }: { price: number | null }) {
  if (price === null) return <span className="text-gray-400">preço da loja</span>
  return <span className="text-gray-900">{formatPrice(price)}</span>
}

function StockCell({ inStock }: { inStock: boolean | null }) {
  if (inStock === null) return <span className="text-gray-400">por confirmar</span>
  return <span className={inStock ? 'text-green-700' : 'text-orange-700'}>{inStock ? 'em stock' : 'esgotado'}</span>
}

export default function NewSizesSection({ sizes }: { sizes: NewSizeRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function approve(ids: string[]) {
    setMessage(null)
    startTransition(async () => {
      const result = await approveNewSizes(ids)
      if (result.success) {
        setMessage(`${result.count} tamanho${result.count === 1 ? '' : 's'} novo${result.count === 1 ? '' : 's'} adicionado${result.count === 1 ? '' : 's'} ao site.`)
        setSelected(new Set())
      } else {
        setMessage(`Erro: ${result.error}`)
      }
    })
  }

  function reject(id: string) {
    setBusyId(id)
    startTransition(async () => {
      const result = await rejectNewSize(id)
      setBusyId(null)
      if (!result.success) setMessage(`Erro: ${result.error}`)
    })
  }

  if (sizes.length === 0) {
    return (
      <section className="mt-10 text-left">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Novos tamanhos encontrados</h2>
        <p className="text-sm text-gray-400">Sem tamanhos novos por rever de momento.</p>
      </section>
    )
  }

  return (
    <section className="mt-10 text-left">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Novos tamanhos encontrados ({sizes.length})</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending || selected.size === 0}
            onClick={() => approve([...selected])}
            className="text-sm font-semibold bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-full hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Aprovar selecionados ({selected.size})
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => approve(sizes.map((s) => s.id))}
            className="text-sm font-semibold bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            Aprovar tudo
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        Tamanhos que as lojas têm à venda mas ainda não aparecem no Parjusto. Aprovar cria a oferta e passa a
        aparecer na página do produto.
      </p>

      {message && <p className="text-sm text-gray-600 mb-3">{message}</p>}

      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left bg-gray-50">
              <th className="p-3 w-8"></th>
              <th className="p-3 font-medium text-gray-500">Produto</th>
              <th className="p-3 font-medium text-gray-500">Loja</th>
              <th className="p-3 font-medium text-gray-500">Preço</th>
              <th className="p-3 font-medium text-gray-500">Disponibilidade</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 last:border-0">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-4 w-4"
                  />
                </td>
                <td className="p-3 text-gray-900">
                  {s.productName}
                  <span className="text-gray-400"> · tam. {s.size}</span>
                </td>
                <td className="p-3 text-gray-700">{s.storeName}</td>
                <td className="p-3"><PriceCell price={s.price} /></td>
                <td className="p-3"><StockCell inStock={s.inStock} /></td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    disabled={isPending && busyId === s.id}
                    onClick={() => reject(s.id)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
                  >
                    Rejeitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
