// lib/authBrowser.ts
'use client'

import { useSyncExternalStore } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Login opcional do Parjusto (link mágico / código enviado por email), só
// para sincronizar favoritos e alertas de preço entre dispositivos. O site
// funciona igual sem conta.
//
// A sessão vive em cookies (é o que o @supabase/ssr faz no browser), para
// as Server Actions (criar alerta, apagar conta...) conseguirem confirmar
// no servidor quem é a pessoa. As páginas em si nunca leem a sessão no
// servidor - por isso continuam em cache (estáticas/ISR) como até aqui, e
// tudo o que é pessoal é carregado aqui, no browser.

let client: SupabaseClient | null = null

export function getAuthClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; userId: string; email: string }

const LOADING: AuthState = { status: 'loading' }
const SIGNED_OUT: AuthState = { status: 'signed-out' }

let state: AuthState = LOADING
const listeners = new Set<() => void>()
let started = false

function setState(next: AuthState) {
  // Mesmo utilizador de antes (ex.: só renovou o token) - não mexe no
  // estado, para não disparar outra vez tudo o que depende dele.
  if (
    next.status === state.status &&
    (next.status !== 'signed-in' || (state.status === 'signed-in' && state.userId === next.userId))
  ) {
    return
  }
  state = next
  listeners.forEach((listener) => listener())
}

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  getAuthClient().auth.onAuthStateChange((_event, session) => {
    const user = session?.user
    const next: AuthState = user
      ? { status: 'signed-in', userId: user.id, email: user.email ?? '' }
      : SIGNED_OUT
    // O Supabase recomenda não fazer outros pedidos ao Supabase dentro
    // deste callback (pode bloquear) - quem depende do estado (ex.: os
    // favoritos) faz pedidos, por isso o aviso segue logo a seguir.
    setTimeout(() => setState(next), 0)
  })
}

export function subscribeAuth(listener: () => void) {
  start()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAuthState(): AuthState {
  return state
}

function getServerAuthState(): AuthState {
  return LOADING
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribeAuth, getAuthState, getServerAuthState)
}

// Antes de chamar uma Server Action que precise de saber quem é a pessoa:
// garante que o token está válido (renova-o aqui no browser, se preciso),
// para o servidor não ter de o renovar ao mesmo tempo - os tokens de
// renovação só podem ser usados uma vez.
export async function ensureFreshSession(): Promise<boolean> {
  const { data } = await getAuthClient().auth.getSession()
  return Boolean(data.session)
}

// "Sair" só neste dispositivo - os outros continuam com sessão iniciada.
export async function signOutHere() {
  await getAuthClient().auth.signOut({ scope: 'local' })
}
