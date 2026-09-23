// lib/formatColor.ts
// Tira partes repetidas do nome da cor, mantendo a ordem original. Algumas
// lojas escrevem a cor por partes do ténis (cabedal / riscas / sola) e,
// quando são todas iguais, fica "Core Black / Core Black / Core Black".
// Aqui passa a "Core Black". Só remove repetições do próprio texto
// guardado - nunca acrescenta, traduz nem inventa nada.
export function dedupeColor(value: string | null | undefined): string | null {
  if (!value) return null
  const seen = new Set<string>()
  const parts = value
    .split('/')
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLowerCase()
      if (!part || seen.has(key)) return false
      seen.add(key)
      return true
    })
  return parts.length > 0 ? parts.join(' / ') : value
}
