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

// Datas em milissegundos (meia-noite local), para o eixo horizontal ser
// uma escala de tempo real: 5 dias sem verificação ocupam o espaço de 5
// dias, e não o mesmo espaço de 1 dia como antes (o eixo era uma lista de
// datas igualmente espaçadas).
function toTime(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).getTime()
}

function formatAxisTime(time: number) {
  return new Date(time).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
}

function formatFullTime(time: number) {
  return new Date(time).toLocaleDateString('pt-PT', {
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

  // Pontos com a data em milissegundos (eixo de tempo real) e as marcas do
  // eixo: no máximo 6 datas que existem mesmo nos dados, espalhadas por
  // igual (primeira e última incluídas).
  const timed = useMemo(() => filtered.map((p) => ({ t: toTime(p.date), price: p.price })), [filtered])
  const xTicks = useMemo(() => {
    if (timed.length <= 6) return timed.map((p) => p.t)
    // Espalhadas por igual no TEMPO (não pela ordem dos pontos), para as
    // datas do eixo não ficarem coladas umas às outras.
    const first = timed[0].t
    const span = timed[timed.length - 1].t - first
    const nearest = (target: number) =>
      timed.reduce((best, p) => (Math.abs(p.t - target) < Math.abs(best - target) ? p.t : best), timed[0].t)
    return Array.from(new Set(Array.from({ length: 6 }, (_, i) => nearest(first + (span * i) / 5))))
  }, [timed])

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
        <h2 className="font-display text-2xl font-bold tracking-[-0.01em] text-[#17232B]">Histórico de preços</h2>

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
            <LineChart data={timed} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                ticks={xTicks}
                tickFormatter={(v) => formatAxisTime(Number(v))}
                tick={{ fontSize: 12, fill: '#5C6770' }}
              />
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
                labelFormatter={(label) => formatFullTime(Number(label))}
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
