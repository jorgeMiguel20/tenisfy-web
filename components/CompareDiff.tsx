// components/CompareDiff.tsx
'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import Link from 'next/link'

// Estado partilhado do toggle "Mostrar só as diferenças" da página
// /comparar (Provider) - CompareDiffToggle (o interruptor), CompareRows (a
// versão empilhada, usada em telemóvel/tablet dentro de cada cartão) e
// CompareTable (a tabela partilhada de desktop, ver abaixo) só se
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
      className="flex items-center gap-3"
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
// (different - decide se a linha desaparece quando o toggle está ligado) e
// qual o índice do "melhor" valor, quando isso faz sentido (best - ex: mais
// lojas com stock, envio grátis com limiar mais baixo, maior descida de
// preço esta semana). O "melhor" valor de cada linha fica destacado na
// mesma cor verde-petróleo usada em todo o site para assinalar vantagem
// (contadores do cabeçalho, coração de favorito, selo de desconto no
// catálogo) - antes era um "✓ melhor" a verde-normal, agora é sempre a
// mesma cor e o mesmo tratamento (texto a negrito + fundo da célula
// ligeiramente colorido).
export type CompareRowData = {
  key: string
  label: string
  display: string[]
  different: boolean
  best: number | null
}

const BEST_BG = 'bg-[#1F5F58]/5'
const BEST_TEXT = 'text-[#1F5F58] font-bold'

// Versão empilhada de um cartão (um produto de cada vez) - usada só em
// telemóvel/tablet (<lg), onde os cartões dos produtos aparecem um a seguir
// ao outro em vez de lado a lado, por isso não há problema de alinhamento
// entre colunas: cada cartão mostra as suas próprias linhas, na sua altura
// natural.
export function CompareRows({ rows, columnIndex }: { rows: CompareRowData[]; columnIndex: number }) {
  const { onlyDifferences } = useCompareDiff()
  const visible = rows.filter((row) => !onlyDifferences || row.different)

  if (visible.length === 0) {
    return <p className="px-6 py-4 text-sm text-gray-400">Sem diferenças neste critério.</p>
  }

  return (
    <div>
      {visible.map((row, i) => {
        const isBest = row.best === columnIndex
        return (
          <div
            key={row.key}
            className={`px-6 py-3 ${isBest ? BEST_BG : i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-900">{row.label}</p>
            <p className={`text-sm mt-0.5 ${isBest ? BEST_TEXT : 'font-medium text-gray-900'}`}>
              {row.display[columnIndex]}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export type CompareOffer = {
  store: string
  price: number
}

// Tabela partilhada de desktop (>=lg): uma única grelha CSS com uma coluna
// de rótulos fixa (Sola, Fecho, Cor, ...) seguida de uma coluna por
// produto, para que cada característica apareça uma única vez em vez de
// repetida em cima de cada produto - pedido do Jorge, confirmado com
// mockup (proposta_comparar_final.html). Não mostra preços por loja (o
// preço mais baixo de cada produto já aparece em cima, no cartão do
// produto - repetir a lista de lojas aqui ficava grande demais com
// produtos com muitas lojas em stock, pedido do Jorge). O botão "Ver
// detalhe" de cada produto fica sempre visível mesmo com o toggle "só
// diferenças" ligado.
export function CompareTable({
  rows,
  columnCount,
  slugs,
}: {
  rows: CompareRowData[]
  columnCount: number
  slugs: string[]
}) {
  const { onlyDifferences } = useCompareDiff()
  const visibleRows = rows.filter((row) => !onlyDifferences || row.different)
  // Tem de ser exactamente a mesma grelha (160px + colunas de 240px) da
  // linha dos produtos em app/comparar/page.tsx, para as colunas ficarem
  // alinhadas por baixo de cada foto - se um dia um dos dois lados mudar,
  // o outro tem de mudar também.
  const gridCols = `160px repeat(${columnCount}, minmax(0, 240px))`

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      {visibleRows.map((row, rowIndex) => (
        <div
          key={row.key}
          className={`grid items-start ${rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wide text-gray-900">
            {row.label}
          </div>
          {Array.from({ length: columnCount }, (_, i) => {
            const isBest = row.best === i
            const isEmpty = row.display[i] === '—'
            return (
              <div
                key={i}
                className={`px-4 py-3 border-l border-gray-100 text-sm ${isBest ? BEST_BG : ''} ${
                  isEmpty ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                <span className={isBest ? BEST_TEXT : ''}>{row.display[i]}</span>
              </div>
            )
          })}
        </div>
      ))}

      {onlyDifferences && visibleRows.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-400 bg-white">
          Sem diferenças nas restantes características.
        </div>
      )}

      {/* Ver detalhe */}
      <div className="grid items-center bg-gray-50" style={{ gridTemplateColumns: gridCols }}>
        <div />
        {slugs.map((slug, i) => (
          <div key={slug} className="px-4 py-4 border-l border-gray-100">
            <Link
              href={`/produto/${slug}`}
              className="flex items-center justify-center w-full rounded-full bg-gray-900 text-white text-sm font-semibold py-2.5 hover:bg-gray-700 transition-colors"
            >
              Ver detalhe
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
