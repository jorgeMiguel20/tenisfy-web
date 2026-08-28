'use client'

import { useSyncExternalStore } from 'react'

// Estado global minimalista (mesma ideia do useSyncExternalStore de
// lib/compare.ts, mas em memória em vez de localStorage - não faz sentido
// o modal continuar aberto entre visitas) para o modal de pesquisa poder
// ser aberto a partir de vários sítios (lupa do cabeçalho, ícone de câmara
// do Hero, botão da secção "Pesquisa por foto") sem precisar de um
// Context/Provider a envolver a app.
let isOpen = false
const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) listener()
}

export function openSearchModal() {
  isOpen = true
  emitChange()
}

export function closeSearchModal() {
  isOpen = false
  emitChange()
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

function getSnapshot() {
  return isOpen
}

function getServerSnapshot() {
  return false
}

export function useSearchModalOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
