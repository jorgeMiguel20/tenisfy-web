// components/EntrarForm.tsx
'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuthClient, useAuth } from '@/lib/authBrowser'
import { LOGIN_NEXT_STORAGE_KEY, safeNextPath } from '@/lib/safeNext'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INPUT_CLASS =
  'mt-2 w-full rounded-none border border-gray-300 px-3 py-2.5 text-sm text-[#17232B] outline-none focus:border-[#17232B]'
const BUTTON_CLASS =
  'inline-flex min-h-[44px] w-full items-center justify-center rounded-none bg-[#17232B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#17232B]/85 disabled:opacity-50'

// Traduz os erros do Supabase para mensagens em português, sem inventar
// causas: o que não se reconhece fica numa mensagem genérica.
function describeError(error: { status?: number; code?: string; message?: string }): string {
  if (error.status === 429 || error.code?.includes('rate_limit')) {
    return 'Pediste vários emails seguidos. Espera um minuto e tenta de novo.'
  }
  if (error.code === 'otp_expired' || error.status === 403) {
    return 'Este código não é válido ou já expirou. Pede um novo email.'
  }
  return 'Não foi possível continuar. Tenta de novo daqui a pouco.'
}

// Entrar no Parjusto sem palavra-passe: a pessoa escreve o email, recebe
// um email com um link e um código, e pode entrar de qualquer das duas
// formas. O código existe porque, no telemóvel, muitas apps de email
// abrem o link no seu próprio browser interno (e a sessão ficava lá, não
// no browser onde a pessoa estava) - com o código fica sempre no sítio
// certo.
export default function EntrarForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const auth = useAuth()
  const next = safeNextPath(searchParams.get('next'))
  const linkError = searchParams.get('erro') === 'link'

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [error, setError] = useState<string | null>(linkError ? 'O link de entrada já não é válido. Pede um novo email.' : null)

  async function sendEmail(e?: FormEvent) {
    e?.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Introduz um email válido.')
      return
    }
    setStatus('loading')
    setError(null)

    try {
      if (next) window.localStorage.setItem(LOGIN_NEXT_STORAGE_KEY, next)
      else window.localStorage.removeItem(LOGIN_NEXT_STORAGE_KEY)
    } catch {
      // Sem acesso ao armazenamento do browser - depois de entrar vai só
      // para "A minha conta" em vez de voltar à página de onde veio.
    }

    const { error: otpError } = await getAuthClient().auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    })
    setStatus('idle')

    if (otpError) {
      setError(describeError(otpError))
      return
    }
    setEmail(trimmed)
    setStep('code')
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    const token = code.replace(/\s/g, '')
    if (!/^\d{6,10}$/.test(token)) {
      setError('O código tem só números - copia-o do email.')
      return
    }
    setStatus('loading')
    setError(null)

    const { error: verifyError } = await getAuthClient().auth.verifyOtp({ email, token, type: 'email' })

    if (verifyError) {
      setStatus('idle')
      setError(describeError(verifyError))
      return
    }
    try {
      window.localStorage.removeItem(LOGIN_NEXT_STORAGE_KEY)
    } catch {
      // ignorado - ver acima
    }
    router.replace(next ?? '/conta')
  }

  if (auth.status === 'signed-in' && step === 'email') {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Já tens sessão iniciada</h1>
        <p className="mt-3 text-sm text-[#5C6770]">
          Entraste como <span className="font-medium text-[#17232B]">{auth.email}</span>.
        </p>
        <Link href={next ?? '/conta'} className={`${BUTTON_CLASS} mt-8`}>
          Continuar
        </Link>
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Vê o teu email</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5C6770]">
          Enviámos um email para <span className="font-medium text-[#17232B]">{email}</span>. Carrega no botão
          do email, ou escreve aqui o código que lá vem.
        </p>

        <form onSubmit={verifyCode} className="mt-8">
          <label htmlFor="codigo" className="text-xs font-semibold text-gray-900">
            Código do email
          </label>
          <input
            id="codigo"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${INPUT_CLASS} tracking-[0.3em]`}
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={status === 'loading'} className={`${BUTTON_CLASS} mt-4`}>
            {status === 'loading' ? 'A entrar...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-[#5C6770]">
          Não chegou? Vê a pasta de spam, ou{' '}
          <button type="button" onClick={() => sendEmail()} className="font-medium text-[#17232B] underline underline-offset-4">
            envia outra vez
          </button>
          {' '}·{' '}
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setCode('')
              setError(null)
            }}
            className="font-medium text-[#17232B] underline underline-offset-4"
          >
            usar outro email
          </button>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Entrar</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#5C6770]">
        Entra com o teu email para teres os teus favoritos e alertas de&nbsp;preço no computador e no telemóvel. Não
        precisas de palavra-passe - enviamos-te um link para entrares. Sem conta, o site funciona na mesma.
      </p>

      <form onSubmit={sendEmail} className="mt-8">
        <label htmlFor="email" className="text-xs font-semibold text-gray-900">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="o-teu-email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT_CLASS}
        />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <button type="submit" disabled={status === 'loading'} className={`${BUTTON_CLASS} mt-4`}>
          {status === 'loading' ? 'A enviar...' : 'Enviar link de entrada'}
        </button>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-[#5C6770]">
        Ao entrar, guardamos o teu email, os teus favoritos e os teus alertas de&nbsp;preço - mais nada. Vê a{' '}
        <Link href="/privacidade" className="font-medium text-[#17232B] underline underline-offset-4">
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  )
}
