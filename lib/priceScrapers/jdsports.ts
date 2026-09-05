// lib/priceScrapers/jdsports.ts
// Scraper de precos/stock para a JD Sports. A pagina do produto em si nao
// tem o preco embutido no HTML (e carregado por outra via depois da
// pagina carregar), mas a propria pagina inclui a configuracao publica do
// Algolia (o motor de pesquisa que a JD Sports usa) - a mesma "chave de
// pesquisa" que o browser de qualquer visitante usa. Com essa chave dá
// para perguntar diretamente ao Algolia pelo "productRef" (o codigo que
// aparece no URL do produto) e receber preco e a lista de tamanhos
// disponiveis nesse preciso momento - mais direto e mais fiavel do que
// tentar ler HTML.
//
// A chave de pesquisa e publica (o proprio site a entrega a qualquer
// visitante) por isso nao ha nada de indevido em usa-la aqui - e o mesmo
// pedido que o site faz sozinho. Vai-se buscar a chave a uma pagina de
// produto a cada execucao (em vez de fixa no codigo) para nunca ficar
// desatualizada se a JD Sports a mudar.

import type { ScraperTarget, ScraperResult } from './types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function normalizeSize(s: string): string {
  const trimmed = s.trim().toLowerCase().replace(',', '.')
  // O indice de pesquisa (Algolia) da JD Sports so lista tamanhos como
  // numero inteiro, mesmo para tenis vendidos com a notacao de tercos
  // (ex: "44 2/3", "47 1/3") - la aparecem simplesmente como "44" ou
  // "47". Sem isto, esses tamanhos nunca davam match e ficavam sempre
  // marcados como indisponiveis, mesmo quando estavam em stock.
  const fractionMatch = trimmed.match(/^(\d+)\s+\d+\/\d+$/)
  if (fractionMatch) return fractionMatch[1]
  return trimmed
}

function productRefFromUrl(url: string): string | null {
  const m = url.match(/\/(\d+)_jdsportspt\//)
  return m ? m[1] : null
}

async function getAlgoliaConfig(sampleUrl: string): Promise<{ appId: string; apiKey: string; index: string } | null> {
  try {
    const res = await fetch(sampleUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!m) return null
    const data = JSON.parse(m[1])
    const ac = data?.props?.pageProps?.algoliaConfig
    const mainIndex = ac?.indices?.find((i: any) => i.type === 'main')
    if (!ac?.applicationId || !ac?.searchApiKey || !mainIndex?.name) return null
    return { appId: ac.applicationId, apiKey: ac.searchApiKey, index: mainIndex.name }
  } catch {
    return null
  }
}

export async function runJdSportsScraper(targets: ScraperTarget[]): Promise<ScraperResult[]> {
  const byUrl = new Map<string, ScraperTarget[]>()
  for (const t of targets) {
    if (!t.url) continue
    if (!byUrl.has(t.url)) byUrl.set(t.url, [])
    byUrl.get(t.url)!.push(t)
  }
  const urls = Array.from(byUrl.keys())
  if (urls.length === 0) return []

  const config = await getAlgoliaConfig(urls[0])
  if (!config) return []

  const perProductResults = await Promise.all(
    Array.from(byUrl.entries()).map(([url, urlTargets]) => lookupOne(config, url, urlTargets))
  )
  return perProductResults.flat()
}

async function lookupOne(
  config: { appId: string; apiKey: string; index: string },
  url: string,
  urlTargets: ScraperTarget[]
): Promise<ScraperResult[]> {
  try {
    const productRef = productRefFromUrl(url)
    if (!productRef) return []

    const res = await fetch(`https://${config.appId}-dsn.algolia.net/1/indexes/${config.index}/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': config.apiKey,
        'X-Algolia-Application-Id': config.appId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '', filters: `productRef:${productRef}`, hitsPerPage: 1 }),
    })
    if (!res.ok) return []

    const json = await res.json()
    const hit = json?.hits?.[0]
    if (!hit) return []

    const price = typeof hit.price === 'number' ? hit.price : null
    if (price === null) return []

    const availableSizes = new Set(
      Array.isArray(hit.size) ? hit.size.map((s: string) => normalizeSize(String(s))) : []
    )
    const productInStock = hit.inStock !== false

    return urlTargets.map((t) => ({
      product_offer_id: t.product_offer_id,
      checked_price: price,
      checked_available: productInStock && availableSizes.has(normalizeSize(t.size ?? '')),
    }))
  } catch {
    return []
  }
}
