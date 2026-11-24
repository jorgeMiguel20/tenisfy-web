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

// Um "pacote" do resumo: as linhas from..from+count-1, pela mesma ordem de
// Relevância (sort_rank é único). Devolve null só se der erro; um pacote sem
// linhas (para lá do fim do catálogo) devolve [].
// Nota: count não pode ser múltiplo de 1000 (o último bocado tem de vir
// incompleto para o fetchAll parar).
export async function getCatalogGridPartFromCache(from: number, count: number): Promise<CachedGridRow[] | null> {
  const last = from + count - 1
  const { data, error } = await fetchAll<CachedGridRow>((start, end) =>
    supabase
      .from('catalog_grid_cache')
      .select('slim, is_curated')
      .order('sort_rank', { ascending: true })
      .range(from + start, Math.min(from + end, last))
  , 1000)
  if (error) return null
  return data
}


// Número total de ténis no resumo (uma contagem simples, não lê as linhas).
// A página /catalogo usa-o para mostrar o total sem ter de carregar tudo.
export async function getCatalogGridCount(): Promise<number | null> {
  const { count, error } = await supabase
    .from('catalog_grid_cache')
    .select('product_id', { count: 'exact', head: true })
  if (error || count == null) return null
  return count
}
