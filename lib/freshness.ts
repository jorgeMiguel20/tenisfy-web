// lib/freshness.ts
// Selo de frescura por loja: só até 48h desde a última verificação, para
// nunca sugerir que os dados podem estar desatualizados quando já passou
// bastante tempo - acima de 48h devolve null (sem selo nenhum, propositado).
export function getFreshnessLabel(lastCheckedAt: string, now: Date = new Date()): string | null {
  const checkedAt = new Date(lastCheckedAt)
  const hoursSince = (now.getTime() - checkedAt.getTime()) / (1000 * 60 * 60)

  if (hoursSince < 0) return null
  if (hoursSince <= 24) return `há ${Math.max(1, Math.round(hoursSince))} h`
  if (hoursSince <= 48) return 'ontem'
  return null
}
