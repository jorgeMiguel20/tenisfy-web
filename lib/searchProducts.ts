// lib/searchProducts.ts
import Fuse from 'fuse.js'
import type { ProductWithPrice } from './types'

// Pesquisa tolerante a erros de escrita (ex: "nikke" ou "nik" encontram
// "Nike"), usada tanto na grelha do catálogo como nas sugestões rápidas do
// dropdown - centralizada aqui para as duas usarem sempre os mesmos resultados.
const FUSE_OPTIONS = {
  keys: ['model_name', 'brands.name'],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
}

export function searchProducts(
  products: ProductWithPrice[],
  query: string,
  limit?: number
): ProductWithPrice[] {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const fuse = new Fuse(products, FUSE_OPTIONS)
  const results = fuse.search(trimmed)
  const items = results.map((r) => r.item)
  return limit != null ? items.slice(0, limit) : items
}
