// components/CompareDiff.tsx
'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

// Estado partilhado do toggle "Mostrar só as diferenças" da página
// /comparar (Provider) - CompareDiffToggle (o interruptor) e CompareRows
// (as linhas de cada cartão) só se conseguem ver e reagir um ao outro
// porque a página (Server Component) os monta todos dentro do mesmo
// Provider; os dados de cada linha (valores, se difere, qual é o "melhor")
// vêm já calculados do servidor - ver app/comparar/page.tsx.
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

export function CompareDiffToggle() {
  const { onlyDifferences, setOnlyDifferences } = useCompareDiff()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={onlyDifferences}
      onClick={() => setOnlyDifferences(!onlyDifferences)}
      className="mt-6 flex items-center gap-3"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          onlyDifferences ? 'bg-gray-900' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            onlyDifferences ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
      <span className="text-sm text-gray-700">Mostrar só as diferenças</span>
    </button>
  )
}

// Uma linha de comparação já vem do servidor com o valor de cada produto
// formatado para mostrar (display), se os produtos diferem nesse critério
// (different - decide o fundo laranja e se a linha desaparece quando o
// toggle está ligado) e qual o índice do "melhor" valor, quando isso faz
// sentido (best - ex: mais lojas com stock, maior descida de preço).
export type CompareRowData = {
  key: string
  label: string
  display: string[]
  different: boolean
  best: number | null
}

export function CompareRows({ rows, columnIndex }: { rows: CompareRowData[]; columnIndex: number }) {
  const { onlyDifferences } = useCompareDiff()
  const visible = rows.filter((row) => !onlyDifferences || row.different)

  if (visible.length === 0) {
    return (
      <p className="px-6 py-4 text-sm text-gray-400">Sem diferenças neste critério.</p>
    )
  }

  return (
    <div>
      {visible.map((row) => (
        <div key={row.key} className={`px-6 py-3 ${row.different ? 'bg-orange-50' : 'bg-white'}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{row.label}</p>
          <p className="text-sm font-medium text-gray-900 mt-0.5">
            {row.display[columnIndex]}
            {row.best === columnIndex && (
              <span className="ml-1.5 align-middle text-xs font-semibold text-green-700">✓ melhor</span>
            )}
          </p>
        </div>
      ))}
    </div>
  )
}
