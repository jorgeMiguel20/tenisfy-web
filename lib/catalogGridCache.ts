// lib/catalogGridCache.ts
//
// Leitura do "resumo do catálogo": a tabela catalog_grid_cache da base de
// dados tem uma linha por ténis com os dados que a grelha usa (preço mais
// baixo, lojas, tamanhos, poupança, descida de preço...), já calculados.
// É preenchida por scripts/refresh-catalog.mjs (workflow "Atualizar resumo do
// catálogo"), depois das importações e algumas vezes por dia.
//
// Porquê: calcular isto a partir das ofertas de cada tamanho de cada loja,
// para mais de 10 000 ténis, demorava minutos e passava o limite de 3
// segundos da base de dados (o publicar do site chegou a falhar por isso).
// Ler o resumo demora segundos.
//
// Se o resumo estiver vazio ou der erro, devolve null e quem chama usa o
// caminho antigo (lib/getProductsWithPrice.ts), por isso o site nunca
// depende só do resumo.
import { supabase } from '@/lib/supabase'
import { fetchAll } from '@/lib/fetchAll'
import type { ProductWithPrice } from '@/lib/types'

export type CachedGridRow = { slim: ProductWithPrice; is_curated: boolean }

export async function getCatalogGridFromCache(options: { brandId?: string } = {}): Promise<CachedGridRow[] | null> {
  const { data, error } = await fetchAll<CachedGridRow>((from, to) => {
    let query = supabase.from('catalog_grid_cache').select('slim, is_curated')
    if (options.brandId) query = query.eq('brand_id', options.brandId)
    return query.order('sort_rank', { ascending: true }).range(from, to)
  }, 1000)
  if (error || data.length === 0) return null
  return data
}
