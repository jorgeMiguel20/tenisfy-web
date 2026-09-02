// app/admin/precos/ProposalsSection.tsx
'use client'

import { useState, useTransition } from 'react'
import { formatPrice } from '@/lib/formatPrice'
import { approveProposals, rejectProposal } from './proposalActions'

export type ProposalRow = {
  id: string
  productName: string
  storeName: string
  size: string
  previousPrice: number
  checkedPrice: number | null
  previousInStock: boolean
  checkedAvailable: boolean | null
}

function PriceDiff({ previous, checked }: { previous: number; checked: number | null }) {
  if (checked === null) {
    return <span className="text-gray-400">sem preço lido</span>
  }
  if (checked === previous) {
    return <span className="text-gray-700">{formatPrice(checked)} (sem alteração)</span>
  }
  const isDrop = checked < previous
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-gray-400 line-through">{formatPrice(previous)}</span>
      <span>→</span>
      <span className={`font-semibold ${isDrop ? 'text-green-700' : 'text-red-700'}`}>
        {formatPrice(checked)}
      </span>
    </span>
  )
}

function StockDiff({ previous, checked }: { previous: boolean; checked: boolean | null }) {
  const label = (v: boolean) => (v ? 'em stock' : 'esgotado')
  if (checked === null) return <span className="text-gray-400">indeterminado</span>
  if (checked === previous) return <span className="text-gray-700">{label(checked)}</span>
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-gray-400 line-through">{label(previous)}</span>
      <span>→</span>
      <span className={`font-semibold ${checked ? 'text-green-700' : 'text-orange-700'}`}>{label(checked)}</span>
    </span>
  )
}

export default function ProposalsSection({ proposals }: { proposals: ProposalRow[] }) {
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

  // Checkbox "selecionar tudo" no cabeçalho da tabela (desktop) e no topo da
  // lista de cards (mobile) - alterna entre selecionar todas as propostas
  // visíveis e limpar a seleção.
  function toggleAll() {
    setSelected((prev) => (prev.size === proposals.length ? new Set() : new Set(proposals.map((p) => p.id))))
  }

  function approve(ids: string[]) {
    setMessage(null)
    startTransition(async () => {
      const result = await approveProposals(ids)
      if (result.success) {
        setMessage(`${result.count} proposta${result.count === 1 ? '' : 's'} aprovada${result.count === 1 ? '' : 's'}.`)
        setSelected(new Set())
      } else {
        setMessage(`Erro: ${result.error}`)
      }
    })
  }

  function reject(id: string) {
    setBusyId(id)
    startTransition(async () => {
      const result = await rejectProposal(id)
      setBusyId(null)
      if (!result.success) setMessage(`Erro: ${result.error}`)
    })
  }

  if (proposals.length === 0) {
    return (
      <section className="mt-10 text-left">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Alterações propostas</h2>
        <p className="text-sm text-gray-400">Sem propostas pendentes de momento.</p>
      </section>
    )
  }

  const allSelected = selected.size === proposals.length && proposals.length > 0

  return (
    <section className="mt-10 text-left">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Alterações propostas ({proposals.length})</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isPending || selected.size === 0}
            onClick={() => approve([...selected])}
            className="text-sm font-semibold bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-full hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Aprovar selecionadas ({selected.size})
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => approve(proposals.map((p) => p.id))}
            className="text-sm font-semibold bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            Aprovar tudo
          </button>
        </div>
      </div>

      {message && <p className="text-sm text-gray-600 mb-3">{message}</p>}

      {/* Desktop/tablet: tabela com checkbox "selecionar tudo" no cabeçalho.
          Escondida em mobile (ver cards abaixo) - a tabela com 6 colunas não
          cabe numa faixa de 375-390px sem overflow horizontal. */}
      <div className="hidden sm:block border border-gray-100 rounded-2xl overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left bg-gray-50">
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todas as propostas"
                  className="h-4 w-4"
                />
              </th>
              <th className="p-3 font-medium text-gray-500">Produto</th>
              <th className="p-3 font-medium text-gray-500">Loja</th>
              <th className="p-3 font-medium text-gray-500">Preço</th>
              <th className="p-3 font-medium text-gray-500">Disponibilidade</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4"
                  />
                </td>
                <td className="p-3 text-gray-900">
                  {p.productName}
                  <span className="text-gray-400"> · tam. {p.size}</span>
                </td>
                <td className="p-3 text-gray-700">{p.storeName}</td>
                <td className="p-3"><PriceDiff previous={p.previousPrice} checked={p.checkedPrice} /></td>
                <td className="p-3"><StockDiff previous={p.previousInStock} checked={p.checkedAvailable} /></td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    disabled={isPending && busyId === p.id}
                    onClick={() => reject(p.id)}
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

      {/* Mobile: cards empilhados em vez da tabela, cada um com o seu
          checkbox - mesma seleção partilhada com a tabela/botões acima. */}
      <div className="flex sm:hidden flex-col gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600 px-1">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label="Selecionar todas as propostas"
            className="h-4 w-4"
          />
          Selecionar tudo
        </label>
        {proposals.map((p) => (
          <div key={p.id} className="border border-gray-100 rounded-2xl p-3 flex gap-3">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="h-4 w-4 mt-1 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 break-words">
                {p.productName}
                <span className="text-gray-400 font-normal"> · tam. {p.size}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{p.storeName}</p>
              <div className="mt-1.5 text-sm"><PriceDiff previous={p.previousPrice} checked={p.checkedPrice} /></div>
              <div className="mt-1 text-sm"><StockDiff previous={p.previousInStock} checked={p.checkedAvailable} /></div>
              <button
                type="button"
                disabled={isPending && busyId === p.id}
                onClick={() => reject(p.id)}
                className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
              >
                Rejeitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
