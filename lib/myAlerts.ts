// lib/myAlerts.ts
'use client'

import { useSyncExternalStore } from 'react'
import { ensureFreshSession, getAuthState, subscribeAuth } from './authBrowser'
import { getMyAlerts, type MyAlert } from '@/app/conta/actions'

// Alertas de preço ativos da pessoa com sessão iniciada, carregados uma só
// vez por página e partilhados por todos os sinos (uma grelha tem muitos
// cards - não faz sentido cada um ir perguntar ao servidor). Sem sessão, a
// lista fica vazia: sem conta não há forma segura de saber que alertas são
// desta pessoa.

export type MyAlertsState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; alerts: MyAlert[]; byProductId: Map<string, MyAlert> }

const NONE: MyAlertsState = { status: 'none' }
const LOADING: MyAlertsState = { status: 'loading' }

let state: MyAlertsState = NONE
let loadedFor: string | null = null
const listeners = new Set<() => void>()
let wired = false

function setState(next: MyAlertsState) {
  state = next
  listeners.forEach((listener) => listener())
}

async function load(userId: string) {
  if (state.status !== 'ready') setState(LOADING)
  await ensureFreshSession()
  const alerts = await getMyAlerts().catch(() => null)
  if (loadedFor !== userId) return
  if (!alerts) {
    setState(NONE)
    return
  }
  setState({ status: 'ready', alerts, byProductId: new Map(alerts.map((a) => [a.productId, a])) })
}

function handleAuthChange() {
  const auth = getAuthState()
  if (auth.status === 'signed-in') {
    if (loadedFor === auth.userId) return
    loadedFor = auth.userId
    void load(auth.userId)
  } else if (auth.status === 'signed-out' && loadedFor !== null) {
    loadedFor = null
    setState(NONE)
  }
}

function subscribe(listener: () => void) {
  if (!wired) {
    wired = true
    subscribeAuth(handleAuthChange)
    handleAuthChange()
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return state
}

function getServerSnapshot() {
  return NONE
}

export function useMyAlerts(): MyAlertsState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// Depois de criar ou apagar um alerta - volta a ler a lista.
export function refreshMyAlerts() {
  if (loadedFor) void load(loadedFor)
}
