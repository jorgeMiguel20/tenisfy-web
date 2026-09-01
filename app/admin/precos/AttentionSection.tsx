// app/admin/precos/AttentionSection.tsx
'use client'

import { useState, useTransition } from 'react'
import { dismissProposal, discontinueOffer } from './proposalActions'

export type AttentionRow = {
  id: string
  productOfferId: string
  productName: string
  storeName: string
  size: string
  url: string
  notes: string | null
  firstFlaggedAt: string
}

// "sinalizado há N dias" a partir de first_flagged_at (data em que a
// proposta pendente foi criada pela primeira vez - nunca é tocada por
// atualizações seguintes ao mesmo problema, ao contrário de checked_at).
function daysPendingLabel(firstFlaggedAt: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(firstFlaggedAt).getTime()) / 86_400_000))
  if (days === 0) return 'sinalizado hoje'
  if (days === 1) return 'sinalizado há 1 dia'
  return `sinalizado há ${days} dias`
}

function AttentionCard({
  row,
  isPending,
  onResolve,
  onDiscontinue,
}: {
  row: AttentionRow
  isPending: boolean
  onResolve: (id: string) => void
  onDiscontinue: (row: AttentionRow) => void
}) {
  return (
    <div className="border border-orange-100 bg-orange-50/40 rounded-2xl p-4 flex items-start justify-between gap-4">
      <div>
        <p className="font-medium text-gray-900">
          {row.productName} <span className="text-gray-400 font-normal">· tam. {row.size} · {row.storeName}</span>
        </p>
        {row.notes && <p className="text-sm text-gray-600 mt-1">{row.notes}</p>}
        <div className="flex items-center gap-3 mt-2">
          <a
            href={row.url}
            target="_blank"
            rel="nofollow noopener"
            className="inline-block text-sm font-semibold text-orange-700 hover:underline"
          >
            Ver página na loja →
          </a>
          <span className="text-xs text-gray-400">{daysPendingLabel(row.firstFlaggedAt)}</span>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onResolve(row.id)}
          className="text-sm font-semibold bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-full hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          Marcar como resolvido
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onDiscontinue(row)}
          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
        >
          Descontinuar oferta
        </button>
      </div>
    </div>
  )
}

export default function AttentionSection({ proposals }: { proposals: AttentionRow[] }) {
  const [isPending, startTransition] = useTransition()
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<string | null>(null)

  function resolve(id: string) {
    startTransition(async () => {
      const result = await dismissProposal(id)
      if (result.success) {
        setResolvedIds((prev) => new Set(prev).add(id))
      } else {
        setMessage(`Erro: ${result.error}`)
      }
    })
  }

  function discontinue(row: AttentionRow) {
    const confirmed = window.confirm(
      'Esta oferta deixa de aparecer no site e no agente de verificação. Confirmas?'
    )
    if (!confirmed) return

    startTransition(async () => {
      const result = await discontinueOffer(row.id, row.productOfferId)
      if (result.success) {
        setResolvedIds((prev) => new Set(prev).add(row.id))
      } else {
        setMessage(`Erro: ${result.error}`)
      }
    })
  }

  const visible = proposals.filter((p) => !resolvedIds.has(p.id))

  if (visible.length === 0) {
    return (
      <section className="mt-10 text-left">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Precisa da tua atenção</h2>
        <p className="text-sm text-gray-400">Nada por resolver de momento.</p>
      </section>
    )
  }

  // Item 5 do pedido do Jorge: agrupar por loja, para se tornar visível
  // quando uma loja específica está sistematicamente a falhar (em vez de
  // parecerem N problemas isolados). Grupos com mais cartões primeiro - é
  // aí que está o problema mais visível.
  const groups = new Map<string, AttentionRow[]>()
  for (const row of visible) {
    const list = groups.get(row.storeName) ?? []
    list.push(row)
    groups.set(row.storeName, list)
  }
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length)

  return (
    <section className="mt-10 text-left">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Precisa da tua atenção ({visible.length})</h2>
      <p className="text-sm text-gray-500 mb-3">
        Leituras incertas ou fora do plausível - confirma tu à mão na loja antes de decidir.
      </p>

      {message && <p className="text-sm text-red-600 mb-3">{message}</p>}

      <div className="flex flex-col gap-6">
        {sortedGroups.map(([storeName, rows]) => (
          <div key={storeName}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {storeName} <span className="text-gray-400 font-normal">({rows.length})</span>
            </h3>
            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <AttentionCard
                  key={row.id}
                  row={row}
                  isPending={isPending}
                  onResolve={resolve}
                  onDiscontinue={discontinue}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
