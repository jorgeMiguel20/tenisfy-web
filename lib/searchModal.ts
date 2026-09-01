'use client'

import { useSyncExternalStore } from 'react'

// Estado global minimalista (mesma ideia do useSyncExternalStore de
// lib/compare.ts, mas em memória em vez de localStorage - não faz sentido
// o modal continuar aberto entre visitas) para o modal de pesquisa poder
// ser aberto a partir de vários sítios (lupa do cabeçalho, ícone de câmara
// do Hero, botão da secção "Pesquisa por foto") sem precisar de um
// Context/Provider a envolver a app.
let isOpen = false

// Foto já escolhida por um botão fora do cabeçalho (ex.: "Experimenta a
// Pesquisa por Foto" da homepage - ver PesquisaPorFotoButton.tsx), à espera
// de ser processada assim que o HeaderSearchBar abrir. Ao contrário da
// versão anterior (que pedia ao HeaderSearchBar para ele próprio acionar o
// seletor de ficheiro assim que abrisse via um efeito), aqui quem aciona o
// seletor é sempre o próprio botão clicado, com o seu input de ficheiro
// sempre montado - alguns browsers móveis só abrem o seletor nativo quando
// o .click() acontece dentro do próprio gesto de toque original, e não
// depois de o React montar e "ligar" outro componente.
let pendingImageFile: File | null = null

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
  pendingImageFile = null
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

// Chamado pelo botão que já tem a foto em mãos (ver PesquisaPorFotoButton.tsx)
// para a entregar ao HeaderSearchBar e abrir o cabeçalho em modo pesquisa.
export function setPendingImageFile(file: File) {
  pendingImageFile = file
  isOpen = true
  emitChange()
}

function getPendingImageFileSnapshot() {
  return pendingImageFile
}

function getPendingImageFileServerSnapshot() {
  return null
}

export function usePendingImageFile() {
  return useSyncExternalStore(subscribe, getPendingImageFileSnapshot, getPendingImageFileServerSnapshot)
}

// Consumido pelo HeaderSearchBar logo depois de começar a processar a foto,
// para não a voltar a processar num próximo render.
export function consumePendingImageFile() {
  pendingImageFile = null
}
