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

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Histórico de preços</h2>

        {hasAnyData && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRangeDays(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  rangeDays === opt.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasEnoughForRange ? (
        <div className="h-64 border border-gray-100 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis
                width={70}
                tickFormatter={(v) => formatPrice(v)}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(value) => [formatPrice(Number(value)), 'Melhor preço']}
                labelFormatter={(label) => formatFullDate(String(label))}
              />
              <Line type="monotone" dataKey="price" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-500">
          A recolher histórico de preços — volta dentro de alguns dias para veres a evolução.
        </div>
      )}
    </div>
  )
}
