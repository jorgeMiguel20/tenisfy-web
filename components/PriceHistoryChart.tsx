// components/PriceHistoryChart.tsx
'use client'

import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPrice } from '@/lib/formatPrice'

export type PricePoint = { date: string; price: number }

const RANGE_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
] as const

function formatAxisDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
}

function formatFullDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function PriceHistoryChart({ data }: { data: PricePoint[] }) {
  const [rangeDays, setRangeDays] = useState<number>(30)

  const filtered = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - rangeDays)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return data.filter((p) => p.date >= cutoffStr)
  }, [data, rangeDays])

  const hasAnyData = data.length > 0
  const hasEnoughForRange = filtered.length >= 2

  // Escala vertical honesta (antes era "auto" e uma diferença de 1 cêntimo,
  // 119,99 € -> 120,00 €, ocupava a altura toda do gráfico, parecendo uma
  // grande oscilação; o eixo também repetia valores como "120,00 €" duas
  // vezes). Agora:
  // - a escala tem sempre uma folga de pelo menos 5% do preço acima e
  //   abaixo, em euros inteiros - variações pequenas parecem pequenas;
  // - o eixo mostra só 3 valores, todos diferentes (mínimo, meio, máximo
  //   da escala). O valor exato de cada dia continua no tooltip.
  const yAxis = useMemo(() => {
    if (filtered.length === 0) return null
    const prices = filtered.map((p) => p.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const pad = Math.max((max - min) * 0.25, max * 0.05, 1)
    const lo = Math.max(0, Math.floor(min - pad))
    const hi = Math.ceil(max + pad)
    const mid = Math.round((lo + hi) / 2)
    const ticks = Array.from(new Set([lo, mid, hi]))
    return { domain: [lo, hi] as [number, number], ticks }
  }, [filtered])

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Histórico de preços</h2>

        {hasAnyData && (
          <div className="flex items-center border border-[#17232B]/10">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRangeDays(opt.value)}
                className={`min-h-[36px] px-3 rounded-none text-xs font-medium transition-colors ${
                  rangeDays === opt.value ? 'bg-[#123F3A] text-white' : 'text-[#5C6770] hover:text-[#17232B]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasEnoughForRange ? (
        <div className="h-64 border border-[#17232B]/10 rounded-none p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 12, fill: '#5C6770' }} />
              <YAxis
                width={70}
                tickFormatter={(v) => formatPrice(v)}
                tick={{ fontSize: 12, fill: '#5C6770' }}
                domain={yAxis?.domain ?? ['auto', 'auto']}
                ticks={yAxis?.ticks}
                allowDataOverflow={false}
              />
              <Tooltip
                formatter={(value) => [formatPrice(Number(value)), 'Melhor preço']}
                labelFormatter={(label) => formatFullDate(String(label))}
              />
              {/* Linha em degraus ("stepAfter"): o preço mantém-se igual até à
                  verificação seguinte que o encontra diferente. A linha curva
                  anterior ("monotone") desenhava subidas e descidas entre os
                  pontos que nunca aconteceram. Verde do site (#123F3A). */}
              <Line
                type="stepAfter"
                dataKey="price"
                stroke="#123F3A"
                strokeWidth={2}
                dot={{ r: 3, fill: '#123F3A', stroke: '#123F3A' }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="border border-[#17232B]/10 rounded-none bg-[#F9FBFC] p-8 text-center text-sm text-gray-500">
          A recolher histórico de preços — volta dentro de alguns dias para veres a evolução.
        </div>
      )}
    </div>
  )
}
