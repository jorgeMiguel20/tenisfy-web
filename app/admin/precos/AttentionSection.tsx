// app/admin/precos/AttentionSection.tsx
'use client'

import { useState, useTransition } from 'react'
import { dismissProposal } from './proposalActions'

export type AttentionRow = {
  id: string
  productName: string
  storeName: string
  size: string
  url: string
  notes: string | null
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

  const visible = proposals.filter((p) => !resolvedIds.has(p.id))

  if (visible.length === 0) {
    return (
      <section className="mt-10 text-left">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Precisa da tua atenção</h2>
        <p className="text-sm text-gray-400">Nada por resolver de momento.</p>
      </section>
    )
  }

  return (
    <section className="mt-10 text-left">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Precisa da tua atenção</h2>
      <p className="text-sm text-gray-500 mb-3">
        Leituras incertas ou fora do plausível - confirma tu à mão na loja antes de decidir.
      </p>

      {message && <p className="text-sm text-red-600 mb-3">{message}</p>}

      <div className="flex flex-col gap-3">
        {visible.map((p) => (
          <div key={p.id} className="border border-orange-100 bg-orange-50/40 rounded-2xl p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">
                {p.productName} <span className="text-gray-400 font-normal">· tam. {p.size} · {p.storeName}</span>
              </p>
              {p.notes && <p className="text-sm text-gray-600 mt-1">{p.notes}</p>}
              <a
                href={p.url}
                target="_blank"
                rel="nofollow noopener"
                className="inline-block text-sm font-semibold text-orange-700 hover:underline mt-2"
              >
                Ver página na loja →
              </a>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => resolve(p.id)}
              className="shrink-0 text-sm font-semibold bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-full hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Marcar como resolvido
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
