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

// O índice do Fuse demora a construir com milhares de ténis; guarda-se um por
// lista de produtos para não o refazer a cada letra escrita.
const fuseCache = new WeakMap<object, Fuse<unknown>>()

// Genérica: funciona com o produto completo (grelha do catálogo) e com a
// versão reduzida do seletor do /comparar - só precisa do nome e da marca.
export function searchProducts<T extends Pick<ProductWithPrice, 'model_name'> & { brands?: { name: string } | null }>(
  products: T[],
  query: string,
  limit?: number
): T[] {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  let fuse = fuseCache.get(products) as Fuse<T> | undefined
  if (!fuse) {
    fuse = new Fuse(products, FUSE_OPTIONS)
    fuseCache.set(products, fuse as Fuse<unknown>)
  }
  const results = fuse.search(trimmed)
  const items = results.map((r) => r.item)
  return limit != null ? items.slice(0, limit) : items
}
