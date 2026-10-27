// lib/catalogGridList.ts
//
// A lista completa do catálogo, pela ordem "Relevância" e já só com os dados
// da grelha. Lê o "resumo do catálogo" (lib/catalogGridCache.ts); se estiver
// vazio ou com erro, calcula tudo como antes (lib/getProductsWithPrice.ts).
// Usada por app/api/catalogo-grelha/route.ts.
import { getCatalogGridFromCache } from '@/lib/catalogGridCache'
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
