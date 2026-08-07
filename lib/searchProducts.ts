// lib/searchProducts.ts
import type { ProductWithPrice } from './types'

// Mesma lógica de correspondência usada na pesquisa da homepage (nome do
// modelo ou marca, mínimo de 2 caracteres) — centralizada aqui para não
// haver uma segunda versão da pesquisa no seletor da página /comparar.
export function searchProducts(
  products: ProductWithPrice[],
  query: string,
  limit = 5
): ProductWithPrice[] {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  const q = trimmed.toLowerCase()
  return products
    .filter(
      (p) =>
        p.model_name.toLowerCase().includes(q) ||
        p.brands?.name?.toLowerCase().includes(q)
    )
    .slice(0, limit)
}
