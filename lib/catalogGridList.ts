// lib/catalogGridList.ts
//
// A lista completa do catálogo, pela ordem "Relevância" e já só com os dados
// da grelha. Lê o "resumo do catálogo" (lib/catalogGridCache.ts); se estiver
// vazio ou com erro, calcula tudo como antes (lib/getProductsWithPrice.ts).
// Usada por app/api/catalogo-grelha/route.ts.
import { getCatalogGridFromCache, getCatalogGridPartFromCache } from '@/lib/catalogGridCache'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'
import { relevanceOrder } from '@/lib/relevanceOrder'
import { slimForGrid } from '@/lib/slimForGrid'
import type { ProductWithPrice } from '@/lib/types'

export async function getCatalogGridList(): Promise<ProductWithPrice[]> {
  const cached = await getCatalogGridFromCache()
  if (cached) return cached.map((row) => row.slim)

  const { products, error } = await getProductsWithPrice()
  if (error) throw new Error(`Catálogo: erro ao carregar produtos (${error})`)
  return relevanceOrder(products).map(slimForGrid)
}

// A lista completa é servida em pacotes (/api/catalogo-grelha/1, /2, ...):
// com mais de 13 000 ténis, um só ficheiro de ~15 MB deixou de ser guardado
// pelo Vercel e o site ficava preso numa cópia antiga.
export const CATALOG_GRID_PART_SIZE = 3500
export const CATALOG_GRID_MAX_PARTS = 6

export async function getCatalogGridPart(part: number): Promise<ProductWithPrice[]> {
  const from = (part - 1) * CATALOG_GRID_PART_SIZE
  const cached = await getCatalogGridPartFromCache(from, CATALOG_GRID_PART_SIZE)
  if (cached && (cached.length > 0 || part > 1)) return cached.map((row) => row.slim)
  // Plano B: resumo com erro ou vazio
  const all = await getCatalogGridList()
  return all.slice(from, from + CATALOG_GRID_PART_SIZE)
}
