// lib/relevanceOrder.ts
//
// Ordem "Relevância" do catálogo: primeiro os ténis escolhidos à mão (pela
// ordem de sempre), depois os importados das lojas afiliadas - os que estão
// em mais lojas primeiro (são os que mais vale a pena comparar), depois os
// que estão com desconto, depois os mais recentes.
//
// Usada pelo script que prepara o resumo do catálogo
// (scripts/refresh-catalog.mjs) e, se o resumo não estiver disponível, pelo
// próprio catálogo (app/catalogo/page.tsx).
import type { ProductWithPrice } from '@/lib/types'

export function relevanceOrder(products: ProductWithPrice[]): ProductWithPrice[] {
  const curated = products.filter((p) => !(p as { source?: string | null }).source)
  const imported = products.filter((p) => (p as { source?: string | null }).source)
  const withStock = (p: ProductWithPrice) => (p.lowest_price != null ? 1 : 0)
  imported.sort(
    (a, b) =>
      withStock(b) - withStock(a) ||
      (b.store_count ?? 0) - (a.store_count ?? 0) ||
      (b.priceDrop ? 1 : 0) - (a.priceDrop ? 1 : 0) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return [...curated, ...imported]
}
