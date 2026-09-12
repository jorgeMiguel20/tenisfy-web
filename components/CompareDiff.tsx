// components/CompareDiff.tsx
'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

// Estado partilhado do toggle "Mostrar só as diferenças" da página
// /comparar (Provider) - CompareDiffToggle (o interruptor), CompareRows (a
// versão empilhada, usada em telemóvel/tablet dentro de cada cartão) e
// CompareCriteriaTable (a tabela partilhada de desktop, ver abaixo) só se
// conseguem ver e reagir umas às outras porque a página (Server Component)
// as monta todas dentro do mesmo Provider; os dados de cada linha (valores,
// se difere, qual é o "melhor") vêm já calculados do servidor - ver
// app/comparar/page.tsx.
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

// Versão empilhada de um cartão (um produto de cada vez) - usada só em
// telemóvel/tablet (<lg), onde os cartões dos produtos aparecem um a seguir
// ao outro em vez de lado a lado, por isso não há problema de alinhamento
// entre colunas: cada cartão mostra as suas próprias linhas, na sua altura
// natural.
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

// Tabela partilhada de desktop (>=lg): uma única grelha CSS com uma coluna
// por produto, onde cada linha (Sola, Fecho, Cor, ...) é desenhada de uma só
// vez para todos os produtos ao mesmo tempo. Isto é o que garante o
// alinhamento perfeito pedido pelo Jorge - quando um produto tem um texto
// mais comprido nalgum critério (ex.: a descrição da sola), é a própria
// grelha do CSS que estica essa linha inteira (em todas as colunas) até à
// mesma altura, em vez de cada cartão empilhar as suas linhas sozinho (o que
// desalinhava tudo a partir da primeira diferença de altura). Por baixo de
// lg cada cartão continua a usar o CompareRows acima, empilhado.
export function CompareCriteriaTable({ rows, columnCount }: { rows: CompareRowData[]; columnCount: number }) {
  const { onlyDifferences } = useCompareDiff()
  const visibleRows = rows.filter((row) => !onlyDifferences || row.different)

  if (visibleRows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-6 py-4 text-sm text-gray-400">
        Sem diferenças entre os produtos selecionados.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          // Espaço entre linhas para a cor branca do fundo (bg-white acima)
          // aparecer sempre a separar uma característica da seguinte, mesmo
          // quando as duas têm o mesmo fundo (ex.: duas linhas laranja
          // seguidas) - pedido do Jorge.
          rowGap: '6px',
        }}
      >
        {visibleRows.flatMap((row) =>
          Array.from({ length: columnCount }, (_, columnIndex) => (
            <div
              key={`${row.key}-${columnIndex}`}
              className={`px-6 py-3 ${row.different ? 'bg-orange-50' : 'bg-white'} ${
                columnIndex > 0 ? 'border-l border-gray-100' : ''
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{row.label}</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {row.display[columnIndex]}
                {row.best === columnIndex && (
                  <span className="ml-1.5 align-middle text-xs font-semibold text-green-700">✓ melhor</span>
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
