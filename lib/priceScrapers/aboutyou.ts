// lib/priceScrapers/aboutyou.ts
// Scraper de precos/stock para a About You. Ao contrario da Foot Locker
// (objeto interno embutido em JS), a About You publica um bloco
// application/ld+json standard (schema.org) com um "ProductGroup" e a
// lista de variantes ("hasVariant"), cada uma com o seu tamanho e a sua
// oferta (preco + disponibilidade). Isto e mais simples e mais estavel do
// que ler estado interno da aplicacao, porque e um formato publico pensado
// para ser lido por terceiros (motores de busca).
//
// Uma variante sem "offers" significa que essa combinacao nao esta a venda
// (esgotada/nao existe) - tratada como fora de stock, sem preco.

import type { ScraperTarget, ScraperResult } from './types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function normalizeSize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(',', '.')
}

function findProductGroup(html: string): any | null {
  const scripts = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)
  for (const m of scripts) {
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : [data]
      const group = items.find((d) => d && d['@type'] === 'ProductGroup')
      if (group) return group
    } catch {
      // bloco seguinte
    }
  }
  return null
}

export async function runAboutYouScraper(targets: ScraperTarget[]): Promise<ScraperResult[]> {
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
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    })
    if (!res.ok) return []

    const html = await res.text()
    if (html.length < 20000) return []

    const group = findProductGroup(html)
    const variants = group?.hasVariant
    if (!Array.isArray(variants) || variants.length === 0) return []

    const bySize = new Map<string, any>()
    for (const v of variants) {
      if (v?.size) bySize.set(normalizeSize(String(v.size)), v)
    }

    const results: ScraperResult[] = []
    for (const t of urlTargets) {
      const key = normalizeSize(t.size ?? '')
      const variant = bySize.get(key)
      if (!variant) continue

      const offer = Array.isArray(variant.offers) ? variant.offers[0] : variant.offers
      if (!offer) {
        // Sem oferta = sem stock desta combinacao, sem preco para reportar.
        results.push({
          product_offer_id: t.product_offer_id,
          checked_price: null,
          checked_available: false,
        })
        continue
      }

      const price = offer.price
      const availability = typeof offer.availability === 'string' ? offer.availability : ''
      if (typeof price !== 'number') continue

      results.push({
        product_offer_id: t.product_offer_id,
        checked_price: price,
        checked_available: availability.includes('InStock'),
      })
    }
    return results
  } catch {
    return []
  }
}
