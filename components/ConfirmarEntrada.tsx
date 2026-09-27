// components/ConfirmarEntrada.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getAuthClient } from '@/lib/authBrowser'
import { LOGIN_NEXT_STORAGE_KEY, safeNextPath } from '@/lib/safeNext'

const VALID_TYPES: EmailOtpType[] = ['email', 'magiclink', 'signup']

const BUTTON_CLASS =
  'inline-flex min-h-[44px] w-full items-center justify-center rounded-none bg-[#17232B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#17232B]/85 disabled:opacity-50'

// Porque é que é preciso carregar num botão (em vez de entrar logo ao
// abrir o link): alguns serviços de email - o Outlook/Hotmail, por
// exemplo - "abrem" sozinhos os links dos emails para verificar se são
// seguros. Como o link de entrada só pode ser usado uma vez, esse clique
// automático gastava-o e a pessoa recebia "link inválido". Esses robôs
// não carregam em botões, por isso o link fica guardado para a pessoa.
export default function ConfirmarEntrada() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash')
  const typeParam = searchParams.get('type') as EmailOtpType | null
  const type = typeParam && VALID_TYPES.includes(typeParam) ? typeParam : null

  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function confirm() {
    if (!tokenHash || !type) return
    setStatus('loading')
    const { error } = await getAuthClient().auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      setStatus('error')
      return
    }

    let next: string | null = null
    try {
      next = safeNextPath(window.localStorage.getItem(LOGIN_NEXT_STORAGE_KEY))
      window.localStorage.removeItem(LOGIN_NEXT_STORAGE_KEY)
    } catch {
      // sem acesso ao armazenamento do browser - vai para "A minha conta"
    }
    router.replace(next ?? '/conta')
  }

  if (!tokenHash || !type || status === 'error') {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Link inválido</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5C6770]">
          Este link de entrada já foi usado ou expirou. Pede um novo - demora só um momento.
        </p>
        <Link href="/entrar" className={`${BUTTON_CLASS} mt-8`}>
          Pedir novo email
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Entrar no Parjusto</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#5C6770]">
        Carrega no botão para entrares. Os teus favoritos e alertas de preço passam a estar em todos os
        dispositivos onde entrares.
      </p>
      <button type="button" onClick={confirm} disabled={status === 'loading'} className={`${BUTTON_CLASS} mt-8`}>
        {status === 'loading' ? 'A entrar...' : 'Entrar'}
      </button>
    </div>
  )
}
