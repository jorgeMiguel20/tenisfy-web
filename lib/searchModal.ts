'use client'

import { useSyncExternalStore } from 'react'

// Estado global minimalista (mesma ideia do useSyncExternalStore de
// lib/compare.ts, mas em memória em vez de localStorage - não faz sentido
// o modal continuar aberto entre visitas) para o modal de pesquisa poder
// ser aberto a partir de vários sítios (lupa do cabeçalho, ícone de câmara
// do Hero, botão da secção "Pesquisa por foto") sem precisar de um
// Context/Provider a envolver a app.
let isOpen = false

// Quando true, o SearchModal deve acionar automaticamente o seletor de
// ficheiro/câmara assim que abrir - usado pelo botão "Experimenta a
// Pesquisa por Foto" da homepage, para ir direto à câmara/galeria em vez
// de mostrar primeiro a barra de texto (ver PesquisaPorFotoButton.tsx).
let autoTriggerFile = false

const listeners = new Set<() => void>()

function emitChange() {
for (const listener of listeners) listener()
}

export function openSearchModal(options?: { autoTriggerFile?: boolean }) {
isOpen = true
autoTriggerFile = !!options?.autoTriggerFile
emitChange()
}

export function closeSearchModal() {
isOpen = false
autoTriggerFile = false
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

function getAutoTriggerSnapshot() {
return autoTriggerFile
}

function getAutoTriggerServerSnapshot() {
return false
}

export function useSearchModalAutoTriggerFile() {
return useSyncExternalStore(subscribe, getAutoTriggerSnapshot, getAutoTriggerServerSnapshot)
}

// Consumido pelo SearchModal logo depois de acionar o input de ficheiro,
// para que fechar e voltar a abrir o modal "normalmente" (ex.: lupa do
// cabeçalho) não volte a disparar o seletor sem o utilizador pedir.
export function consumeAutoTriggerFile() {
autoTriggerFile = false
}
