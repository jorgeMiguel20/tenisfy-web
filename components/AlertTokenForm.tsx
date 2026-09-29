// components/AlertTokenForm.tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { AlertActionState } from '@/app/alertas/actions'

const BUTTON_CLASS =
  'inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#123F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b] disabled:opacity-60'

type Props = {
  token: string
  action: (state: AlertActionState, formData: FormData) => Promise<AlertActionState>
  buttonLabel: string
  pendingLabel: string
  successTitle: string
  successText: string
  backHref: string
  backLabel: string
}

// Botão de confirmar/cancelar um alerta. Mostra o resultado na própria
// página depois de a pessoa carregar.
export default function AlertTokenForm({
  token,
  action,
  buttonLabel,
  pendingLabel,
  successTitle,
  successText,
  backHref,
  backLabel,
}: Props) {
  const [state, formAction, pending] = useActionState<AlertActionState, FormData>(action, { status: 'idle' })

  if (state.status === 'ok') {
    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{successTitle}</h1>
        <p className="text-gray-500 mb-6">{successText}</p>
        <Link href={backHref} className={BUTTON_CLASS}>
          {backLabel}
        </Link>
      </>
    )
  }

  if (state.status === 'invalid') {
    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Link inválido</h1>
        <p className="text-gray-500 mb-6">Este link não é válido ou já foi usado.</p>
        <Link href="/" className={BUTTON_CLASS}>
          Ir para o Parjusto
        </Link>
      </>
    )
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      {state.status === 'error' && (
        <p className="mb-4 text-sm text-red-600">Algo correu mal. Tenta novamente daqui a pouco.</p>
      )}
      <button type="submit" disabled={pending} className={BUTTON_CLASS}>
        {pending ? pendingLabel : buttonLabel}
      </button>
    </form>
  )
}
