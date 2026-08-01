// lib/favorites.ts
'use client'

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'tenisfy_favorites'
const CHANGE_EVENT = 'tenisfy-favorites-changed'

let cachedRaw: string | null = null
let cachedFavorites: string[] = []

// useSyncExternalStore exige que, se os dados não mudaram, devolvamos sempre
// a mesma referência (senão entra em loop de re-render) — daí a cache.
function readFavorites(): string[] {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === cachedRaw) return cachedFavorites

  cachedRaw = raw
  try {
    cachedFavorites = raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    cachedFavorites = []
  }
  return cachedFavorites
}

function writeFavorites(slugs: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  // localStorage só dispara o evento 'storage' noutras abas; disparamos este à mão
  // para que todos os corações na mesma página fiquem sincronizados de imediato.
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

// useSyncExternalStore compara por referência: devolver [] novo a cada
// chamada dispara o aviso "should be cached" — por isso é uma constante.
const EMPTY_FAVORITES: string[] = []

function getServerSnapshot(): string[] {
  return EMPTY_FAVORITES
}

// Usa useSyncExternalStore (em vez de useState + useEffect) para ler o
// localStorage: evita desfasamento entre o HTML do servidor e o cliente, e
// não corre da forma que a regra do ESLint set-state-in-effect assinala.
export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, readFavorites, getServerSnapshot)

  const toggleFavorite = useCallback((slug: string) => {
    const current = readFavorites()
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug]
    writeFavorites(next)
  }, [])

  const isFavorite = useCallback((slug: string) => favorites.includes(slug), [favorites])

  return { favorites, isFavorite, toggleFavorite }
}
