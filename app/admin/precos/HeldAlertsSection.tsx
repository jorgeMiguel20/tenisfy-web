// app/admin/precos/HeldAlertsSection.tsx
'use client'

import { useState, useTransition } from 'react'
import { sendHeldAlerts } from './heldAlertActions'
import type { HeldAlert } from '@/lib/priceAlerts'
import { formatPrice } from '@/lib/formatPrice'

// Alertas de preço que os travões de segurança não deixaram sair (preço com
// menos de metade do habitual, ou demasiados alertas de uma vez - ver
// lib/priceAlerts.ts). Nada foi enviado aos utilizadores. O Jorge confirma
// o preço na loja: se estiver certo, carrega em "Enviar"; se for um erro da
// loja, não faz nada e o alerta continua à espera.
export default function HeldAlertsSection({ alerts }: { alerts: HeldAlert[] }) {
  const [isPending, startTransition] = useTransition()
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<string | null>(null)

  const visible = alerts.filter((a) => !sentIds.has(a.alertId))

  function send(items: HeldAlert[]) {
    if (items.length === 0) return
    const text =
      items.length === 1
        ? 'Confirmaste na loja que este preço está certo? O e-mail vai ser enviado ao utilizador.'
        : `Confirmaste na loja que estes ${items.length} preços estão certos? Os e-mails vão ser enviados aos utilizadores.`
    if (!window.confirm(text)) return

    startTransition(async () => {
      const result = await sendHeldAlerts(items.map((i) => ({ alertId: i.alertId, productId: i.productId })))
      if (result.success) {
        setSentIds((prev) => {
          const next = new Set(prev)
          items.forEach((i) => next.add(i.alertId))
          return next
        })
        setMessage(`${result.sent} e-mail(s) enviado(s).`)
      } else {
        setMessage(`Erro: ${result.error}`)
      }
    })
  }

  if (visible.length === 0) {
    return (
      <section className="mt-10 text-left">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Alertas retidos</h2>
        <p className="text-sm text-gray-400">
          {message ?? 'Nenhum alerta retido. Os travões de segurança não encontraram nada suspeito.'}
        </p>
      </section>
    )
  }

  return (
    <section className="mt-10 text-left">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-900">Alertas retidos ({visible.length})</h2>
        {visible.length > 1 && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => send(visible)}
            className="text-sm font-semibold bg-gray-900 text-white px-4 py-2 rounded-none hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            Enviar todos
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Nenhum destes e-mails foi enviado. Abre o ténis, confirma o preço na loja e só depois carrega em
        &quot;Enviar&quot;. Se o preço for um erro da loja, não faças nada.
      </p>

      {message && <p className="text-sm text-gray-700 mb-3">{message}</p>}

      <div className="flex flex-col gap-3">
        {visible.map((a) => (
          <div
            key={a.alertId}
            className="border border-red-100 bg-red-50/40 rounded-none p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 break-words">
                {a.productName}{' '}
                <span className="text-gray-400 font-normal">
                  · {a.size ? `tam. ${a.size}` : 'qualquer tamanho'} ·{' '}
                  {a.kind === 'restock' ? 'voltou ao stock' : `alvo ${formatPrice(a.targetPrice)}`}
                </span>
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Preço novo: <strong>{formatPrice(a.price)}</strong>
                {a.referencePrice != null && (
                  <span className="text-gray-500"> · habitual {formatPrice(a.referencePrice)}</span>
                )}
              </p>
              <p className="text-xs text-red-700 mt-1">{a.reason}</p>
              {a.productSlug && (
                <a
                  href={`/produto/${a.productSlug}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-block text-sm font-semibold text-gray-900 hover:underline mt-2"
                >
                  Ver ténis e lojas →
                </a>
              )}
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => send([a])}
              className="shrink-0 text-sm font-semibold bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-none hover:bg-gray-50 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              Enviar
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
