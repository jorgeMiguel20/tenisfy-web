// components/CompareDiff.tsx
'use client'

import { createContext, useContext, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { COMPARE_GRID, COMPARE_LABEL, COMPARE_LINE, valueCellClass } from '@/lib/compareGrid'

// Estado partilhado do toggle "Mostrar só as diferenças" da página
// /comparar (Provider) - CompareDiffToggle (o interruptor) e CompareTable
// (a tabela de características) só se conseguem ver e reagir uma à outra
// porque a página (Server Component) as monta dentro do mesmo Provider; os
// dados de cada linha (valores, se difere, qual é o "melhor") vêm já
// calculados do servidor - ver app/comparar/page.tsx.
type CompareDiffContextValue = {
  onlyDifferences: boolean
  setOnlyDifferences: (value: boolean) => void
}

const CompareDiffContext = createContext<CompareDiffContextValue | null>(null)

export function CompareDiffProvider({ children }: { children: ReactNode }) {
  const [onlyDifferences, setOnlyDifferences] = useState(false)
  return (
    <CompareDiffContext.Provider value={{ onlyDifferences, setOnlyDifferences }}>
      {children}
    </CompareDiffContext.Provider>
  )
}

function useCompareDiff() {
  const ctx = useContext(CompareDiffContext)
  if (!ctx) throw new Error('useCompareDiff tem de ser usado dentro de CompareDiffProvider')
  return ctx
}

// Interruptor com as cores do site: verde #123F3A quando ligado, sem
// sombra no círculo (regra visual: nada de sombras). O interruptor é das
// poucas peças que continua redondo - é a forma própria deste controlo.
export function CompareDiffToggle() {
  const { onlyDifferences, setOnlyDifferences } = useCompareDiff()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={onlyDifferences}
      onClick={() => setOnlyDifferences(!onlyDifferences)}
      className="flex min-h-[44px] items-center gap-3"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          onlyDifferences ? 'bg-[#123F3A]' : 'bg-[#17232B]/15'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            onlyDifferences ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
      <span className="text-sm text-[#17232B]">Mostrar só as diferenças</span>
    </button>
  )
}

// Uma linha de comparação já vem do servidor com o valor de cada produto
// formatado para mostrar (display), se os produtos diferem nesse critério
// (different - decide se a linha desaparece quando o toggle está ligado) e
// qual o índice do "melhor" valor, quando isso faz sentido (best - ex: mais
// lojas com stock, envio grátis com limiar mais baixo, maior descida de
// preço esta semana). O melhor valor fica a verde #123F3A e a meio-negrito,
// sem fundo colorido na célula (regra visual: superfícies lisas, só linhas
// de 1px).
export type CompareRowData = {
  key: string
  label: string
  display: string[]
  different: boolean
  best: number | null
}

// Tabela de características: usa exatamente a mesma grelha que as fotos e
// os nomes por cima (ver lib/compareGrid.ts), por isso cada valor fica
// sempre por baixo do ténis a que pertence - no telemóvel e no desktop.
// No telemóvel o nome da característica ocupa uma linha inteira e os
// valores dos ténis aparecem lado a lado por baixo (em vez de um cartão
// por ténis, empilhados, que obrigava a descer a página toda e a decorar
// os valores do primeiro para os comparar com o segundo).
export function CompareTable({
  rows,
  slugs,
  withSlot,
  gridStyle,
}: {
  rows: CompareRowData[]
  slugs: string[]
  withSlot: boolean
  gridStyle: CSSProperties
}) {
  const { onlyDifferences } = useCompareDiff()
  const visibleRows = rows.filter((row) => !onlyDifferences || row.different)

  // Célula vazia da coluna "Adicionar outro produto" (só a partir de md),
  // para as linhas seguintes não "subirem" para essa coluna.
  const slotSpacer = withSlot ? (
    <div aria-hidden="true" className={`hidden md:block md:border-l md:border-t ${COMPARE_LINE}`} />
  ) : null

  return (
    <div className={`${COMPARE_GRID} border-b ${COMPARE_LINE}`} style={gridStyle}>
      {visibleRows.map((row) => (
        <div key={row.key} className="contents">
          <p className={`col-span-full border-t px-3 pt-4 md:col-span-1 md:py-5 md:pl-0 md:pr-6 md:leading-6 ${COMPARE_LINE} ${COMPARE_LABEL}`}>
            {row.label}
          </p>
          {slugs.map((slug, i) => {
            const isBest = row.best === i
            const isEmpty = row.display[i] === '—'
            return (
              <p
                key={slug}
                className={`${valueCellClass(i)} hyphens-auto break-words pb-4 pt-1.5 text-sm leading-relaxed md:hyphens-manual md:border-t md:py-5 md:text-[15px] md:leading-6 ${
                  isBest
                    ? 'font-semibold text-[#123F3A]'
                    : isEmpty
                      ? 'text-[#17232B]/30'
                      : 'text-[#17232B]'
                }`}
              >
                {row.display[i]}
              </p>
            )
          })}
          {slotSpacer}
        </div>
      ))}

      {onlyDifferences && visibleRows.length === 0 && (
        <p className={`col-span-full border-t px-3 py-5 text-sm text-[#5C6770] md:px-0 ${COMPARE_LINE}`}>
          Sem diferenças nas restantes características.
        </p>
      )}

      {/* Ver detalhe - sempre visível, mesmo com "só diferenças" ligado. */}
      <div aria-hidden="true" className={`hidden md:block md:border-t ${COMPARE_LINE}`} />
      {slugs.map((slug, i) => (
        <div key={slug} className={`${valueCellClass(i)} border-t py-4 md:py-6`}>
          <Link
            href={`/produto/${slug}`}
            prefetch={false}
            className="flex min-h-[44px] w-full items-center justify-center whitespace-nowrap rounded-none bg-[#123F3A] px-1 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d2f2b] md:px-2 md:text-sm"
          >
            Ver detalhe
          </Link>
        </div>
      ))}
      {slotSpacer}
    </div>
  )
}
