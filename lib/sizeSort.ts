// lib/sizeSort.ts
//
// Ordena tamanhos de calçado pelo valor real. As lojas escrevem os tamanhos
// de formas diferentes ("40", "40.5", "40 2/3", "41 1/3") e um parseFloat
// simples lê "40 2/3" como 40, o que deixava "40 2/3" antes de "40".

export function sizeValue(size: string): number {
  const match = size.trim().match(/^(\d+(?:[.,]\d+)?)(?:\s+(\d+)\/(\d+))?/)
  if (!match) return Number.POSITIVE_INFINITY // tamanhos estranhos vão para o fim
  const whole = parseFloat(match[1].replace(',', '.'))
  const fraction = match[2] && match[3] ? Number(match[2]) / Number(match[3]) : 0
  return whole + fraction
}

export function compareSizes(a: string, b: string): number {
  return sizeValue(a) - sizeValue(b)
}
