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

// Marcas com até este número de ofertas em stock pedem só o seu histórico;
// acima disso compensa o resumo geral da base de dados.
const MAX_OFFERS_FOR_TARGETED_HISTORY = 1500
const HISTORY_OFFERS_PER_REQUEST = 50

type DailyMinPriceRow = { product_id: string; day: string; price: number }

export async function getProductsWithPrice(options: GetProductsOptions = {}): Promise<{
  products: ProductWithPrice[]
  error: string | null
}> {
  // Catálogo completo (sem filtro de marca nem "só escolhidos à mão"): bocados
  // mais pequenos (150), porque com mais de 10 000 ténis cada bocado de 400
  // com todas as ofertas chegava a passar o limite de 3 segundos da base de
  // dados e o build do site falhava. Marcas e listas curtas mantêm 400.
  const pageSize = options.onlyCurated || options.brandId ? 400 : 150
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
  }, pageSize)

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

  // Página de uma marca pequena: só se pede o histórico das ofertas em stock
  // dessa marca. Antes pedia-se sempre o resumo de TODOS os ténis do site, e
  // a primeira visita a uma marca com 1 ténis demorava 5 a 10 segundos.
  // Marcas com muitas ofertas (ex.: adidas) continuam a usar o resumo
  // pronto da base de dados, que aí compensa.
  const inStockOffers = products.flatMap((p) =>
    ((p.product_offers ?? []) as any[]).filter((o) => o.in_stock).map((o) => ({ offerId: o.id as string, productId: p.id as string }))
  )
  if (options.brandId && inStockOffers.length <= MAX_OFFERS_FOR_TARGETED_HISTORY) {
    const productByOffer = new Map(inStockOffers.map((o) => [o.offerId, o.productId]))
    const since = new Date()
    since.setDate(since.getDate() - (PRICE_DROP_WINDOW_DAYS + 1))
    const sinceDay = since.toISOString().slice(0, 10)
    const offerIds = inStockOffers.map((o) => o.offerId)
    const chunks: string[][] = []
    for (let i = 0; i < offerIds.length; i += HISTORY_OFFERS_PER_REQUEST) chunks.push(offerIds.slice(i, i + HISTORY_OFFERS_PER_REQUEST))
    for (let i = 0; i < chunks.length; i += 4) {
      const results = await Promise.all(
        chunks.slice(i, i + 4).map((ids) =>
          fetchAll<{ product_offer_id: string; price: number; recorded_at: string }>((from, to) =>
            supabase
              .from('price_history')
              .select('product_offer_id, price, recorded_at')
              .in('product_offer_id', ids)
              .gte('recorded_at', sinceDay)
              .order('recorded_at')
              .order('product_offer_id')
              .range(from, to)
          )
        )
      )
      for (const { data: rows } of results) {
        for (const row of rows) {
          const productId = productByOffer.get(row.product_offer_id)
          if (!productId) continue
          const list = historyByProduct.get(productId) ?? []
          list.push({ price: Number(row.price), recorded_at: row.recorded_at })
          historyByProduct.set(productId, list)
        }
      }
    }
  } else {
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
