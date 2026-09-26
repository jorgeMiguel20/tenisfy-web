// lib/priceDrop.ts
// Deteta descidas de preço reais a partir do histórico gravado em
// price_history (populado quando os preços são verificados). Nunca infere
// uma descida a partir de um único ponto - exige sempre dois dias distintos
// com registo.

// asOfDate = dia (YYYY-MM-DD) mais recente usado na comparação - permite a
// quem escolhe entre vários produtos com descida desempatar pela mais
// recente (ver app/page.tsx, seleção do produto em destaque).
// sinceDate = dia de referência (o preço de onde desceu).
export type PriceDropResult = { amount: number; asOfDate: string; sinceDate: string } | null

type HistoryRow = { price: number; recorded_at: string }

// Janela das "descidas recentes": 14 dias.
//
// Antes comparava só o último dia verificado com o dia verificado antes
// desse. Como os preços raramente mudam de um dia para o outro, bastava uma
// verificação com o preço igual para a descida "desaparecer" - e a secção
// de promoções ficava vazia quase sempre (pedido do Jorge: "Promoções" não
// mostrava nada). Agora compara o melhor preço do dia mais recente com o
// melhor preço do primeiro dia registado nos últimos 14 dias.
export const PRICE_DROP_WINDOW_DAYS = 14

// Melhor preço (mínimo entre lojas) por dia - mesma agregação usada no
// gráfico de histórico da página de produto. Só conta como descida se for
// >= 0,50 €. Um preço que sobe e volta ao mesmo valor dentro da janela não
// conta (o dia de referência é o primeiro da janela, não o mais caro).
export function computePriceDrop(historyRows: HistoryRow[], now: Date = new Date()): PriceDropResult {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - PRICE_DROP_WINDOW_DAYS)
  const cutoffDate = cutoff.toISOString().slice(0, 10)

  const bestPriceByDate = new Map<string, number>()
  for (const row of historyRows) {
    const date = row.recorded_at.slice(0, 10)
    if (date < cutoffDate) continue
    const current = bestPriceByDate.get(date)
    if (current == null || row.price < current) bestPriceByDate.set(date, row.price)
  }

  const dates = Array.from(bestPriceByDate.keys()).sort()
  if (dates.length < 2) return null

  const sinceDate = dates[0]
  const latestDate = dates[dates.length - 1]
  const referencePrice = bestPriceByDate.get(sinceDate)!
  const latestPrice = bestPriceByDate.get(latestDate)!

  const rawDrop = Math.round((referencePrice - latestPrice) * 100) / 100
  if (rawDrop < 0.5) return null

  return { amount: rawDrop, asOfDate: latestDate, sinceDate }
}
