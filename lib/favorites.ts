// lib/favorites.ts
'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { getAuthClient, getAuthState, subscribeAuth } from './authBrowser'

// Favoritos em dois modos:
// - sem sessão iniciada: guardados só neste browser (localStorage), como
//   sempre foram;
// - com sessão iniciada: guardados na conta (tabela "favorites" no
//   Supabase, protegida para cada pessoa só ver os seus), e por isso iguais
//   em todos os dispositivos onde a pessoa entrar.
// No primeiro login num browser, os favoritos que lá estavam passam para a
// conta e deixam de ficar guardados no browser (senão, ao voltar a este
// browser, favoritos apagados noutro dispositivo "ressuscitavam").

const STORAGE_KEY = 'app_favorites'
const CHANGE_EVENT = 'app-favorites-changed'

let cachedRaw: string | null = null
let cachedFavorites: string[] = []

// useSyncExternalStore exige que, se os dados não mudaram, devolvamos sempre
// a mesma referência (senão entra em loop de re-render) — daí a cache.
function readLocalFavorites(): string[] {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    raw = null
  }
  if (raw === cachedRaw) return cachedFavorites

  cachedRaw = raw
  try {
    cachedFavorites = raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    cachedFavorites = []
  }
  return cachedFavorites
}

function notify() {
  // localStorage só dispara o evento 'storage' noutras abas; disparamos este à mão
  // para que todos os corações na mesma página fiquem sincronizados de imediato.
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function writeLocalFavorites(slugs: string[]) {
  try {
    if (slugs.length === 0) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  } catch {
    // modo privado sem armazenamento - não há onde guardar
  }
  notify()
}

// --- Modo conta -----------------------------------------------------------

let mode: 'local' | 'account' = 'local'
let accountUserId: string | null = null
let accountFavorites: string[] = []

async function fetchAccountFavorites(): Promise<string[] | null> {
  const { data, error } = await getAuthClient()
    .from('favorites')
    .select('product_slug')
    .order('created_at', { ascending: true })
  if (error || !data) return null
  return data.map((row: { product_slug: string }) => row.product_slug)
}

async function loadAccount(userId: string) {
  const supabase = getAuthClient()

  // Passa os favoritos deste browser para a conta (sem duplicar os que já
  // lá estão). Só se apagam do browser depois de gravados com sucesso -
  // se a gravação falhar, continuam cá e tenta-se na próxima visita.
  const local = readLocalFavorites()
  if (local.length > 0) {
    const { error } = await supabase
      .from('favorites')
      .upsert(
        local.map((slug) => ({ user_id: userId, product_slug: slug })),
        { onConflict: 'user_id,product_slug', ignoreDuplicates: true }
      )
    if (!error) {
      // Já estão na conta: passa a mostrá-los a partir daí antes de os
      // limpar do browser, para os corações não piscarem vazios enquanto
      // se lê a lista completa da conta.
      if (accountUserId === userId) {
        mode = 'account'
        accountFavorites = local
      }
      writeLocalFavorites([])
    }
  }

  const slugs = await fetchAccountFavorites()
  // Entretanto a pessoa saiu (ou entrou outra conta) - descarta.
  if (accountUserId !== userId) return
  // Não foi possível ler da conta: fica a funcionar no browser, como sem
  // sessão, em vez de mostrar os favoritos vazios.
  if (!slugs) return

  mode = 'account'
  accountFavorites = slugs
  notify()
}

function handleAuthChange() {
  const auth = getAuthState()
  if (auth.status === 'signed-in') {
    if (accountUserId === auth.userId) return
    accountUserId = auth.userId
    void loadAccount(auth.userId)
    return
  }
  if (auth.status === 'signed-out' && accountUserId !== null) {
    accountUserId = null
    mode = 'local'
    accountFavorites = []
    notify()
  }
}

// Ao voltar a este separador (ex.: depois de mexer nos favoritos no
// telemóvel), volta a ler da conta para mostrar o estado mais recente.
function handleVisibility() {
  if (document.visibilityState !== 'visible' || mode !== 'account' || !accountUserId) return
  const userId = accountUserId
  void fetchAccountFavorites().then((slugs) => {
    if (!slugs || accountUserId !== userId) return
    if (slugs.length === accountFavorites.length && slugs.every((s, i) => s === accountFavorites[i])) return
    accountFavorites = slugs
    notify()
  })
}

let authWired = false

function subscribe(onChange: () => void) {
  if (!authWired) {
    authWired = true
    subscribeAuth(handleAuthChange)
    handleAuthChange()
    document.addEventListener('visibilitychange', handleVisibility)
  }
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

function getSnapshot(): string[] {
  return mode === 'account' ? accountFavorites : readLocalFavorites()
}

// useSyncExternalStore compara por referência: devolver [] novo a cada
// chamada dispara o aviso "should be cached" — por isso é uma constante.
const EMPTY_FAVORITES: string[] = []

function getServerSnapshot(): string[] {
  return EMPTY_FAVORITES
}

async function toggleAccountFavorite(slug: string) {
  const userId = accountUserId
  if (!userId) return
  const previous = accountFavorites
  const removing = previous.includes(slug)

  // Muda logo no ecrã e grava a seguir; se a gravação falhar, desfaz.
  accountFavorites = removing ? previous.filter((s) => s !== slug) : [...previous, slug]
  notify()

  const supabase = getAuthClient()
  const { error } = removing
    ? await supabase.from('favorites').delete().eq('user_id', userId).eq('product_slug', slug)
    : await supabase
        .from('favorites')
        .upsert({ user_id: userId, product_slug: slug }, { onConflict: 'user_id,product_slug', ignoreDuplicates: true })

  if (error && accountUserId === userId) {
    accountFavorites = previous
    notify()
  }
}

// Usa useSyncExternalStore (em vez de useState + useEffect) para ler o
// localStorage: evita desfasamento entre o HTML do servidor e o cliente, e
// não corre da forma que a regra do ESLint set-state-in-effect assinala.
export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggleFavorite = useCallback((slug: string) => {
    if (mode === 'account') {
      void toggleAccountFavorite(slug)
      return
    }
    const current = readLocalFavorites()
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug]
    writeLocalFavorites(next)
  }, [])

  const isFavorite = useCallback((slug: string) => favorites.includes(slug), [favorites])

  return { favorites, isFavorite, toggleFavorite }
}
