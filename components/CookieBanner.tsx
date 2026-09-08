// components/CookieBanner.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Aviso informativo sobre cookies. O site atualmente so usa cookies/armazenamento
// tecnicos essenciais (ex.: guardar favoritos) e o Vercel Analytics, que nao usa
// cookies - por isso, legalmente, nao seria obrigatorio um banner de consentimento.
// Mesmo assim, mostramos este aviso porque muitos visitantes perguntam sobre
// cookies e preferimos ser transparentes. Quando existirem cookies de rastreio
// (ex.: links de afiliados), este componente devera evoluir para um verdadeiro
// banner de consentimento com opcao de aceitar/recusar.
const STORAGE_KEY = 'cookie-consent-ack'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true)
      }
    } catch {
      // localStorage indisponivel (ex.: modo privado) - nao mostra o aviso
      // para nao bloquear a navegacao.
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // se nao conseguir guardar, o aviso volta a aparecer na proxima visita,
      // o que nao e grave.
    }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-gray-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-200">
          Este site utiliza cookies e tecnologias semelhantes essenciais ao seu funcionamento (por exemplo, para guardar os teus favoritos). Ao continuares a navegar, aceitas a nossa{' '}
          <Link href="/privacidade" className="underline hover:text-white">
            Politica de Privacidade
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}
