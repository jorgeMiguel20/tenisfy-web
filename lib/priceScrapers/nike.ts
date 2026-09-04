// lib/priceScrapers/nike.ts
// Scraper de precos para a Nike. Le o __NEXT_DATA__ (formato standard do
// Next.js, delimitado de forma clara por um <script id="__NEXT_DATA__">)
// e vai buscar o preco ao "productGroup" do modelo/cor identificado pelo
// codigo de estilo (ex: "CW2288-111") que aparece no fim do URL da pagina.
//
// A Nike so mostra preco ao nivel do modelo/cor (nao varia por tamanho), e
// o campo de estado por tamanho encontrado ("sizes[].status") mostrou-se
// sempre "ACTIVE" mesmo em tamanhos claramente esgotados - ou seja, nao e
// stock real, so uma flag de catalogo. Por isso este scraper reporta so o
// preco e deixa checked_available por confirmar (null) em vez de assumir
// que esta tudo disponivel.

import type { ScraperTarget, ScraperResult } from './types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function styleCodeFromUrl(url: string): string | null {
  const clean = url.split('?')[0].replace(/\/$/, '')
  const last = clean.split('/').pop()
  return last || null
}

export async function runNikeScraper(targets: ScraperTarget[]): Promise<ScraperResult[]> {
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
    const styleCode = styleCodeFromUrl(url)
    if (!styleCode) return []

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

    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!m) return []

    const data = JSON.parse(m[1])
    const productGroups = data?.props?.pageProps?.productGroups
    if (!Array.isArray(productGroups)) return []

    let price: number | null = null
    for (const group of productGroups) {
      const product = group?.products?.[styleCode]
      const currentPrice = product?.prices?.currentPrice
      if (typeof currentPrice === 'number') {
        price = currentPrice
        break
      }
    }
    if (price === null) return []

    return urlTargets.map((t) => ({
      product_offer_id: t.product_offer_id,
      checked_price: price,
      checked_available: null,
      notes: 'Nike: disponibilidade por tamanho ainda nao e fiavel de confirmar automaticamente, so o preco foi confirmado.',
    }))
  } catch {
    return []
  }
}
