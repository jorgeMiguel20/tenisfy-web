// lib/priceDrop.ts
// Deteta descidas de preço reais a partir do histórico gravado em
// price_history (populado pelo botão "Marcar preços como verificados hoje").
// Nunca infere uma descida a partir de um único ponto - exige sempre dois
// dias distintos com registo.

export type PriceDropResult = { amount: number } | null

type HistoryRow = { price: number; recorded_at: string }

// Compara o melhor preço (mínimo entre lojas) do dia mais recente com
// registo contra o do dia anterior a esse - mesma agregação por dia usada no
// gráfico de histórico da página de produto (ver bestPriceByDate em
// app/produto/[slug]/page.tsx). Só considera descida se for >= 1€.
export function computePriceDrop(historyRows: HistoryRow[]): PriceDropResult {
  const bestPriceByDate = new Map<string, number>()
  for (const row of historyRows) {
    const date = row.recorded_at.slice(0, 10)
    const current = bestPriceByDate.get(date)
    if (current == null || row.price < current) bestPriceByDate.set(date, row.price)
  }

  const dates = Array.from(bestPriceByDate.keys()).sort()
  if (dates.length < 2) return null

  const latestPrice = bestPriceByDate.get(dates[dates.length - 1])!
  const previousPrice = bestPriceByDate.get(dates[dates.length - 2])!

  const rawDrop = Math.round((previousPrice - latestPrice) * 100) / 100
  if (rawDrop < 1) return null

  return { amount: rawDrop }
}
