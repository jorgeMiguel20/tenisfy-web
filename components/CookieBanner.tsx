// components/CookieBanner.tsx
'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'

// Aviso informativo sobre cookies. O site atualmente so usa cookies/armazenamento
// tecnicos essenciais (ex.: guardar favoritos, manter a sessao da conta
// opcional) e o Vercel Analytics, que nao usa
// cookies - por isso, legalmente, nao seria obrigatorio um banner de consentimento.
// Mesmo assim, mostramos este aviso porque muitos visitantes perguntam sobre
// cookies e preferimos ser transparentes. Quando existirem cookies de rastreio
// (ex.: links de afiliados), este componente devera evoluir para um verdadeiro
// banner de consentimento com opcao de aceitar/recusar.
const STORAGE_KEY = 'cookie-consent-ack'
const CHANGE_EVENT = 'cookie-consent-changed'

// Fechado nesta visita mesmo que o browser nao deixe guardar (modo privado).
let dismissedInMemory = false

function readAcknowledged(): boolean {
  if (dismissedInMemory) return true
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    // localStorage indisponivel (ex.: modo privado) - nao mostra o aviso
    // para nao bloquear a navegacao.
    return true
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

export default function CookieBanner() {
  // Lido com useSyncExternalStore (em vez de useState + useEffect): no
  // servidor conta como "ja visto" (nao aparece no HTML), e no browser
  // aparece logo se ainda nao foi fechado.
  const acknowledged = useSyncExternalStore(subscribe, readAcknowledged, () => true)

  function dismiss() {
    dismissedInMemory = true
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // se nao conseguir guardar, o aviso volta a aparecer na proxima visita,
      // o que nao e grave.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  if (acknowledged) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-gray-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-200">
          Este site utiliza cookies e tecnologias semelhantes essenciais ao seu funcionamento (por exemplo, para guardar os teus favoritos e, se entrares na tua conta, manter a sessão iniciada). Ao continuares a navegar, aceitas a nossa{' '}
          <Link href="/privacidade" className="underline hover:text-white">
            Politica de Privacidade
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-none bg-white px-5 text-sm font-semibold text-[#17232B] transition-colors hover:bg-[#E8F2EF]"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}
