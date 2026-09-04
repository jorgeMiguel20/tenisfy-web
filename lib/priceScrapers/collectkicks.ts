// lib/priceScrapers/collectkicks.ts
// Scraper de precos para a CollectKicks (loja Shopify). Lojas Shopify
// expoem o JSON completo de qualquer produto so acrescentando ".json" ao
// URL da pagina (endpoint publico e estavel da propria plataforma,
// pensado para ser lido por terceiros) - nao e preciso ler HTML nem
// extrair estado embutido.
//
// Esta loja em particular nao devolve um campo de disponibilidade por
// tamanho neste JSON, por isso o scraper reporta so o preco e deixa
// checked_available por confirmar (null) em vez de adivinhar.

import type { ScraperTarget, ScraperResult } from './types'

function normalizeSize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function toProductJsonUrl(url: string): string {
  const noQuery = url.split('?')[0]
  return noQuery.endsWith('.json') ? noQuery : `${noQuery.replace(/\/$/, '')}.json`
}

export async function runCollectKicksScraper(targets: ScraperTarget[]): Promise<ScraperResult[]> {
  const byUrl = new Map<string, ScraperTarget[]>()
  for (const t of targets) {
    if (!t.url) continue
    if (!byUrl.has(t.url)) byUrl.set(t.url, [])
    byUrl.get(t.url)!.push(t)
  }

  const perUrlResults = await Promise.all(
    Array.from(byUrl.entries()).map(([url, urlTargets]) => scrapeOneUrl(url, urlTargets))
  )
  return perUrlResults.flat()
}

async function scrapeOneUrl(url: string, urlTargets: ScraperTarget[]): Promise<ScraperResult[]> {
  try {
    const jsonUrl = toProductJsonUrl(url)
    const res = await fetch(jsonUrl, { cache: 'no-store' })
    if (!res.ok) return []

    const data = await res.json()
    const variants = data?.product?.variants
    if (!Array.isArray(variants) || variants.length === 0) return []

    const byTitle = new Map<string, any>()
    for (const v of variants) {
      if (v?.title) byTitle.set(normalizeSize(String(v.title)), v)
    }

    const results: ScraperResult[] = []
    for (const t of urlTargets) {
      const key = normalizeSize(t.size ?? '')
      const variant = byTitle.get(key)
      if (!variant) continue

      const price = typeof variant.price === 'string' ? parseFloat(variant.price) : variant.price
      if (typeof price !== 'number' || Number.isNaN(price)) continue

      results.push({
        product_offer_id: t.product_offer_id,
        checked_price: price,
        checked_available: null,
        notes: 'CollectKicks: disponibilidade nao e reportada pela loja, so o preco foi confirmado.',
      })
    }
    return results
  } catch {
    return []
  }
}
