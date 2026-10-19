// lib/getProductsWithPrice.ts
// Busca + cálculo de preço/poupança/descida partilhados entre a homepage
// (que só precisa de uma amostra para o "Comparar" e o "Maior poupança
// agora"), /catalogo (que precisa do conjunto todo para a grelha com
// filtros), /promocoes, /marcas e as páginas de cada marca.
//
// Com a importação automática das lojas afiliadas (About You, ...) o
// catálogo passou a ter milhares de ténis. Por isso:
//   - os ténis vêm aos bocados de 1000 (ver lib/fetchAll.ts) - antes uma
//     só consulta ficava cortada às 1000 linhas sem dar erro;
//   - o histórico de preços para as "descidas recentes" vem já resumido
//     pela base de dados (melhor preço por ténis e por dia, últimos 15
//     dias - função catalog_daily_min_prices, ver sql/catalog_scale.sql),
//     em vez de milhares de linhas de histórico;
//   - onlyCurated: só os ténis escolhidos à mão (os que não vieram da
//     importação automática). A homepage, /marcas e /promocoes usam esta
//     opção para ficarem exatamente como estavam;
//   - brandId: só os ténis de uma marca (páginas /marcas/<marca>).
import { supabase } from '@/lib/supabase'
import { productSelect } from '@/lib/productColumns'
import { fetchAll } from '@/lib/fetchAll'
import { computeSavingsFromRawOffers } from './savings'
import { computePriceDrop, PRICE_DROP_WINDOW_DAYS } from './priceDrop'
import type { ProductWithPrice } from './types'

export type GetProductsOptions = {
  onlyCurated?: boolean
  brandId?: string
}

const SHOW_HIDDEN_IMPORTS = process.env.VERCEL_ENV === 'preview'

type DailyMinPriceRow = { product_id: string; day: string; price: number }

export async function getProductsWithPrice(options: GetProductsOptions = {}): Promise<{
  products: ProductWithPrice[]
  error: string | null
}> {
  const { data: rawProducts, error } = await fetchAll<any>((from, to) => {
    let query = supabase
      .from('products')
      .select(productSelect(`
        brands (*),
        product_offers (id, price, in_stock, store_id, size, last_checked_at, affiliate_url, discontinued_at, stores (name, base_url, shipping_base_fee, shipping_free_threshold, affiliate_url_template))
      `))
    // Nas versões de pré-visualização do site (Vercel "Preview", nunca no
    // site real) mostram-se também os ténis importados que ainda estão
    // escondidos - para o Jorge os ver no catálogo antes de os aprovar.
    query = SHOW_HIDDEN_IMPORTS ? query.or('is_active.eq.true,source.not.is.null') : query.eq('is_active', true)
    if (options.onlyCurated) query = query.is('source', null)
    if (options.brandId) query = query.eq('brand_id', options.brandId)
    return query.order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)
    // Bocados de 400 ténis (com as ofertas de cada um): com milhares de
    // ténis, bocados de 1000 chegavam a passar o limite de 3 segundos da
    // base de dados e o catálogo mostrava "Erro ao carregar produtos".
  }, 400)

  if (error) {
    return { products: [], error }
  }

  // Ofertas descontinuadas (loja deixou de vender - ver "Descontinuar
  // oferta" em /admin/precos) tratam-se como se não existissem em lado
  // nenhum do site, não só na página do produto.
  const products = rawProducts.map((p) => ({
    ...p,
    product_offers: ((p.product_offers ?? []) as any[]).filter((o) => !o.discontinued_at),
  }))

  // Melhor preço por dia de cada ténis (ofertas em stock), para detetar
  // descidas de preço recentes. Se a função da base de dados falhar, o site
  // continua a funcionar - só não mostra descidas.
  const historyByProduct = new Map<string, { price: number; recorded_at: string }[]>()
  const wanted = new Set(products.map((p) => p.id as string))
  const { data: historyRows } = await fetchAll<DailyMinPriceRow>((from, to) =>
    supabase
      .rpc('catalog_daily_min_prices', { p_days: PRICE_DROP_WINDOW_DAYS + 1 })
      .order('product_id')
      .order('day')
      .range(from, to)
  )
  for (const row of historyRows) {
    if (!wanted.has(row.product_id)) continue
    const list = historyByProduct.get(row.product_id) ?? []
    list.push({ price: Number(row.price), recorded_at: row.day })
    historyByProduct.set(row.product_id, list)
  }

  const productsWithPrice: ProductWithPrice[] = products.map((p) => {
    const inStockOffers = p.product_offers.filter((o: any) => o.in_stock)
    const lowest_price = inStockOffers.length > 0
      ? Math.min(...inStockOffers.map((o: any) => o.price))
      : null
    const distinctStores = new Set(inStockOffers.map((o: any) => o.store_id))
    const sizes = Array.from(new Set(inStockOffers.map((o: any) => o.size))) as string[]
    const savings = computeSavingsFromRawOffers(p.product_offers as any[], p.brands?.name)
    const priceDrop = computePriceDrop(historyByProduct.get(p.id) ?? [])
    return { ...p, lowest_price, store_count: distinctStores.size, sizes, savings, priceDrop }
  })

  return { products: productsWithPrice, error: null }
}
