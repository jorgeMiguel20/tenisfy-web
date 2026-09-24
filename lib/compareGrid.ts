// lib/compareGrid.ts
import type { CSSProperties } from 'react'

// Grelha partilhada da página /comparar (app/comparar/page.tsx) e da
// tabela de características (components/CompareDiff.tsx).
//
// Antes, a linha das fotos e a tabela por baixo eram duas grelhas com
// larguras e espaçamentos diferentes, e as colunas ficavam desalinhadas
// (os valores não começavam por baixo das fotos). Agora todas as partes
// usam exatamente o mesmo modelo de colunas e o mesmo espaçamento de
// célula (valueCellClass), dentro do mesmo contentor - por isso ficam
// sempre alinhadas.
//
// - Telemóvel: só as colunas dos produtos, lado a lado (2 ou 3). O nome de
//   cada característica aparece numa linha própria, por cima dos valores.
// - A partir de md: uma coluna de 180px com os nomes das características
//   à esquerda, uma coluna por produto e, se ainda houver lugar livre, uma
//   coluna extra para "Adicionar outro produto".
export const COMPARE_LINE = 'border-[#17232B]/10'
export const COMPARE_LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'
// -mx-3 no telemóvel: a grelha "sai" 12px para cada lado e todas as
// colunas têm o mesmo espaçamento interno (px-3) - assim as fotos e os
// textos ficam com a mesma largura nas 2 ou 3 colunas, e o conteúdo da
// primeira coluna continua alinhado com o título da página.
export const COMPARE_GRID = 'grid -mx-3 grid-cols-[var(--cmp-cols)] md:mx-0 md:grid-cols-[var(--cmp-cols-md)]'

export function compareGridStyle(productCount: number, withSlot: boolean): CSSProperties {
  const columns = Math.max(1, productCount)
  return {
    '--cmp-cols': `repeat(${columns}, minmax(0, 1fr))`,
    '--cmp-cols-md': `180px repeat(${columns + (withSlot ? 1 : 0)}, minmax(0, 1fr))`,
  } as CSSProperties
}

// Espaçamento e linha vertical de uma célula de produto (coluna i). No
// telemóvel as colunas a seguir à primeira têm uma linha de 1px à
// esquerda; a partir de md todas têm essa linha (a coluna dos nomes das
// características fica à esquerda).
export function valueCellClass(index: number): string {
  return `${index > 0 ? 'border-l' : ''} px-3 md:border-l md:px-6 ${COMPARE_LINE}`
}
