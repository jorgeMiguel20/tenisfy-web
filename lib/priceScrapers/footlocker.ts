// lib/priceScrapers/footlocker.ts
// Scraper de precos/stock para a Foot Locker. Le o HTML da pagina do
// produto diretamente (sem JS/browser), tal como o servidor a devolve, e
// extrai o objeto "STATE_FROM_SERVER" embutido num <script> simples
// (sem type="application/json"), fazendo parsing manual por contagem de
// chavetas equilibradas porque o objeto e demasiado grande/aninhado para
// uma regex conseguir isolar com seguranca.
//
// Principio central: nunca inventar. Se uma pagina vier bloqueada, um
// tamanho nao for encontrado, ou o preco nao aparecer onde e esperado,
// o alvo e simplesmente ignorado (fica de fora do resultado) em vez de
// devolver um valor a adivinhar - fica so registado no "summary" da cron
// job para o Jorge poder ver quantos alvos ficaram por confirmar.

import type { ScraperTarget, ScraperResult } from './types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function extractBalancedJson(html: string, marker: string): any | null {
  const markerIndex = html.indexOf(marker)
  if (markerIndex === -1) return null
  const braceStart = html.indexOf('{', markerIndex)
  if (braceStart === -1) return null

  let depth = 0
  let inStr = false
  let esc = false

  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i]

    if (inStr) {
      if (esc) {
        esc = false
      } else if (ch === '\\') {
        esc = true
      } else if (ch === '"') {
        inStr = false
      }
      continue
    }

    if (ch === '"') {
      inStr = true
      continue
    }
    if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        const jsonStr = html.slice(braceStart, i + 1)
        try {
          return JSON.parse(jsonStr)
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function normalizeSize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function runFootLockerScraper(targets: ScraperTarget[]): Promise<ScraperResult[]> {
  // Varios tamanhos do mesmo produto partilham o mesmo URL - so e preciso
  // pedir a pagina uma vez por URL, mesmo que existam 10 tamanhos a verificar.
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

    // Sinal de bloqueio/pagina de desafio: a pagina real tem centenas de KB.
    if (html.length < 20000) return []

    const state = extractBalancedJson(html, 'STATE_FROM_SERVER')
    const sizes = state?.api?.productDetails?.getDetails?.data?.sizes
    if (!Array.isArray(sizes) || sizes.length === 0) return []

    const byEuSize = new Map<string, any>()
    const bySizeField = new Map<string, any>()
    for (const s of sizes) {
      const eu = s?.sizeVariants?.eu
      if (eu) byEuSize.set(normalizeSize(String(eu)), s)
      if (s?.size) bySizeField.set(normalizeSize(String(s.size)), s)
    }

    const results: ScraperResult[] = []
    for (const t of urlTargets) {
      const key = normalizeSize(t.size ?? '')
      const match = byEuSize.get(key) ?? bySizeField.get(key)
      if (!match) continue

      const price = match?.price?.salePrice
      const available = match?.inventory?.inventoryAvailable
      if (typeof price !== 'number') continue

      results.push({
        product_offer_id: t.product_offer_id,
        checked_price: price,
        checked_available: typeof available === 'boolean' ? available : null,
      })
    }
    return results
  } catch {
    return []
  }
}

// Funcao de diagnostico temporaria - usada so por /api/cron/price-check
// quando chamado com ?debug=footlocker, para perceber porque um pedido
// servidor-a-servidor (sem browser) pode ser tratado de forma diferente
// pela Foot Locker do que um pedido feito a partir de um browser real.
export async function debugFootLockerUrl(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
    },
    cache: 'no-store',
  })
  const html = await res.text()
  const hasMarker = html.includes('STATE_FROM_SERVER')
  const state = hasMarker ? extractBalancedJson(html, 'STATE_FROM_SERVER') : null
  const sizes = state?.api?.productDetails?.getDetails?.data?.sizes
  return {
    status: res.status,
    htmlLength: html.length,
    hasMarker,
    stateParsed: !!state,
    sizesCount: Array.isArray(sizes) ? sizes.length : null,
    htmlSnippet: html.slice(0, 300),
  }
}
