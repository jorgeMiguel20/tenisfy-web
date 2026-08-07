// lib/compare.ts
'use client'

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'app_compare'
const CHANGE_EVENT = 'app-compare-changed'
export const MAX_COMPARE = 3

let cachedRaw: string | null = null
let cachedCompare: string[] = []

// useSyncExternalStore exige que, se os dados não mudaram, devolvamos sempre
// a mesma referência (senão entra em loop de re-render) — daí a cache.
function readCompare(): string[] {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === cachedRaw) return cachedCompare

  cachedRaw = raw
  try {
    cachedCompare = raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    cachedCompare = []
  }
  return cachedCompare
}

function writeCompare(slugs: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  // localStorage só dispara o evento 'storage' noutras abas; disparamos este à mão
  // para que o cabeçalho e a barra flutuante fiquem sincronizados de imediato.
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
const EMPTY_COMPARE: string[] = []

function getServerSnapshot(): string[] {
  return EMPTY_COMPARE
}

// Mesmo padrão de lib/favorites.ts (useSyncExternalStore sobre localStorage),
// para que o link "Comparar" no cabeçalho e a barra flutuante "X produtos
// selecionados" leiam sempre a mesma seleção, sem duplicar estado.
export function useCompare() {
  const compareSlugs = useSyncExternalStore(subscribe, readCompare, getServerSnapshot)

  // Devolve false quando a mudança é bloqueada por já haver MAX_COMPARE selecionados.
  const toggleCompare = useCallback((slug: string) => {
    const current = readCompare()
    if (current.includes(slug)) {
      writeCompare(current.filter((s) => s !== slug))
      return true
    }
    if (current.length >= MAX_COMPARE) {
      return false
    }
    writeCompare([...current, slug])
    return true
  }, [])

  const setCompare = useCallback((slugs: string[]) => {
    writeCompare(slugs.slice(0, MAX_COMPARE))
  }, [])

  const clearCompare = useCallback(() => writeCompare([]), [])

  const isSelected = useCallback((slug: string) => compareSlugs.includes(slug), [compareSlugs])

  return { compareSlugs, toggleCompare, setCompare, clearCompare, isSelected }
}
