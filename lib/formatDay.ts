// lib/formatDay.ts
// "2026-09-12" -> "12/09" (dia/mês, como no resto do site em pt-PT).
export function formatDay(isoDate: string): string {
  const [, month, day] = isoDate.slice(0, 10).split('-')
  return `${day}/${month}`
}
