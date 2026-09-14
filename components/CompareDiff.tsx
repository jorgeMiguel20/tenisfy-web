// components/CompareDiff.tsx
'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'

// Estado partilhado do toggle "Mostrar sÃ³ as diferenÃ§as" da pÃ¡gina
// /comparar (Provider) - CompareDiffToggle (o interruptor), CompareRows (a
// versÃ£o empilhada, usada em telemÃ³vel/tablet dentro de cada cartÃ£o) e
// CompareTable (a tabela partilhada de desktop, ver abaixo) sÃ³ se
// conseguem ver e reagir umas Ã s outras porque a pÃ¡gina (Server Component)
// as monta todas dentro do mesmo Provider; os dados de cada linha (valores,
// se difere, qual Ã© o "melhor") vÃªm jÃ¡ calculados do servidor - ver
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
      <span className="text-sm text-gray-700">Mostrar sÃ³ as diferenÃ§as</span>
    </button>
  )
}

// Uma linha de comparaÃ§Ã£o jÃ¡ vem do servidor com o valor de cada produto
// formatado para mostrar (display), se os produtos diferem nesse critÃ©rio
// (different - decide se a linha desaparece quando o toggle estÃ¡ ligado) e
// qual o Ã­ndice do "melhor" valor, quando isso faz sentido (best - ex: mais
// lojas com stock, envio grÃ¡tis com limiar mais baixo, maior descida de
// preÃ§o esta semana). O "melhor" valor de cada linha fica destacado na
// mesma cor verde-petrÃ³leo usada em todo o site para assinalar vantagem
// (contadores do cabeÃ§alho, coraÃ§Ã£o de favorito, selo de desconto no
// catÃ¡logo) - antes era um "â melhor" a verde-normal, agora Ã© sempre a
// mesma cor e o mesmo tratamento (texto a negrito + fundo da cÃ©lula
// ligeiramente colorido), incluindo o preÃ§o mais barato e a linha de
// "Lojas e preÃ§os" que antes vivia numa caixa Ã  parte.
export type CompareRowData = {
  key: string
  label: string
  display: string[]
  different: boolean
  best: number | null
}

const BEST_BG = 'bg-[#1F5F58]/5'
const BEST_TEXT = 'text-[#1F5F58] font-bold'

// VersÃ£o empilhada de um cartÃ£o (um produto de cada vez) - usada sÃ³ em
// telemÃ³vel/tablet (<lg), onde os cartÃµes dos produtos aparecem um a seguir
// ao outro em vez de lado a lado, por isso nÃ£o hÃ¡ problema de alinhamento
// entre colunas: cada cartÃ£o mostra as suas prÃ³prias linhas, na sua altura
// natural.
export function CompareRows({ rows, columnIndex }: { rows: CompareRowData[]; columnIndex: number }) {
  const { onlyDifferences } = useCompareDiff()
  const visible = rows.filter((row) => !onlyDifferences || row.different)

  if (visible.length === 0) {
    return <p className="px-6 py-4 text-sm text-gray-400">Sem diferenÃ§as neste critÃ©rio.</p>
  }

  return (
    <div>
      {visible.map((row, i) => {
        const isBest = row.best === columnIndex
        return (
          <div
            key={row.key}
            className={`px-6 py-3 ${isBest ? BEST_BG : i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{row.label}</p>
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

// Tabela partilhada de desktop (>=lg): uma Ãºnica grelha CSS com uma coluna
// de rÃ³tulos fixa (Sola, Fecho, Cor, ...) seguida de uma coluna por
// produto, para que cada caracterÃ­stica apareÃ§a uma Ãºnica vez em vez de
// repetida em cima de cada produto - pedido do Jorge, confirmado com
// mockup (proposta_comparar_final.html). A mesma tabela tambÃ©m mostra
// "Lojas e preÃ§os" (substitui a caixa "PreÃ§os por loja" que existia Ã 
// parte, repetida por baixo de cada cartÃ£o) e o botÃ£o "Ver detalhe" de
// cada produto - ambos sempre visÃ­veis mesmo com o toggle "sÃ³ diferenÃ§as"
// ligado, tal como jÃ¡ acontecia antes.
export function CompareTable({
  rows,
  columnCount,
  offersByColumn,
  priceBestIndex,
  slugs,
}: {
  rows: CompareRowData[]
  columnCount: number
  offersByColumn: CompareOffer[][]
  priceBestIndex: number | null
  slugs: string[]
}) {
  const { onlyDifferences } = useCompareDiff()
  const visibleRows = rows.filter((row) => !onlyDifferences || row.different)
  // Tem de ser exactamente a mesma grelha (160px + colunas de 240px) da
  // linha dos produtos em app/comparar/page.tsx, para as colunas ficarem
  // alinhadas por baixo de cada foto - se um dia um dos dois lados mudar,
  // o outro tem de mudar tambÃ©m.
  const gridCols = `160px repeat(${columnCount}, minmax(0, 240px))`

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      {/* Lojas e preÃ§os */}
      <div className="grid items-start" style={{ gridTemplateColumns: gridCols }}>
        <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Lojas e preÃ§os
        </div>
        {Array.from({ length: columnCount }, (_, i) => {
          const offers = offersByColumn[i] ?? []
          const isBest = priceBestIndex === i
          return (
            <div key={i} className={`px-4 py-3 border-l border-gray-100 text-sm ${isBest ? BEST_BG : ''}`}>
              {offers.length === 0 ? (
                <span className="text-gray-400">â</span>
              ) : (
                offers.map((offer, oi) => (
                  <div
                    key={offer.store}
                    className={`flex items-center justify-between gap-2 ${oi > 0 ? 'mt-1' : ''}`}
                  >
                    <span className={oi === 0 ? 'text-gray-700' : 'text-gray-400 text-xs'}>{offer.store}</span>
                    <span
                      className={
                        oi === 0 ? (isBest ? BEST_TEXT : 'font-semibold text-gray-900') : 'text-gray-400 text-xs'
                      }
                    >
                      {formatPrice(offer.price)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>

      {visibleRows.map((row, rowIndex) => (
        <div
          key={row.key}
          className={`grid items-start ${rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {row.label}
          </div>
          {Array.from({ length: columnCount }, (_, i) => {
            const isBest = row.best === i
            const isEmpty = row.display[i] === 'â'
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
          Sem diferenÃ§as nas restantes caracterÃ­sticas.
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
