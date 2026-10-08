// app/api/store-logo/route.ts
//
// Serve o logótipo de cada loja a partir do próprio Parjusto (ver
// lib/storeLogo.ts). O servidor vai buscar o logótipo uma vez e a Vercel
// guarda-o em cache durante 30 dias - o browser do visitante nunca contacta
// a Google nem o site da loja.
//
// Se não conseguir obter o logótipo, devolve uma imagem simples com a
// inicial da loja, para nunca aparecer uma imagem partida.

import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// Marcas globais: logótipo oficial do Simple Icons (licença CC0), guardado
// aqui no código - o cdn.simpleicons.org recusa pedidos vindos do servidor.
const INLINE_LOGOS: Record<string, { color: string; path: string }> = {
  'nike.com': {
    color: '#111111',
    path: 'M24 7.8L6.442 15.276c-1.456.616-2.679.925-3.668.925-1.12 0-1.933-.392-2.437-1.177-.317-.504-.41-1.143-.28-1.918.13-.775.476-1.6 1.036-2.478.467-.71 1.232-1.643 2.297-2.8a6.122 6.122 0 00-.784 1.848c-.28 1.195-.028 2.072.756 2.632.373.261.886.392 1.54.392.522 0 1.11-.084 1.764-.252L24 7.8z',
  },
  'adidas.pt': {
    color: '#000000',
    path: 'm24 19.535-8.697-15.07-4.659 2.687 7.145 12.383Zm-8.287 0L9.969 9.59 5.31 12.277l4.192 7.258ZM4.658 14.723l2.776 4.812H1.223L0 17.41Z',
  },
  'newbalance.pt': {
    color: '#CF0A2C',
    path: 'M12.169 10.306l1.111-1.937 3.774-.242.132-.236-3.488-.242.82-1.414h6.47c1.99 0 3.46.715 2.887 2.8-.17.638-.979 2.233-3.356 2.899.507.06 1.76.616 1.54 2.057-.384 2.558-3.69 3.774-5.533 3.774l-7.641.006-.38-1.48 4.005-.28.137-.237-4.346-.264-.467-1.755 6.178-.363.137-.231-11.096-.693.534-.925 11.948-.775.138-.231-3.504-.231m5 .385l1.1-.006c.738-.005 1.502-.34 1.783-1.018.259-.632-.088-1.171-.55-1.166h-1.067l-1.266 2.19zm-1.27 2.195l-1.326 2.305h1.265c.589 0 1.64-.292 1.964-1.128.302-.781-.253-1.177-.638-1.177h-1.266zM6.26 16.445l-.77 1.315L0 17.77l.534-.923 5.726-.402zm.385-10.216l4.417.006.336 1.248-5.276-.33.523-.924zm5 2.245l.484 1.832-7.542-.495.528-.92 6.53-.417zm-3.84 5.281l-.957 1.661-5.32-.302.534-.924 5.743-.435z',
  },
  'zalando.pt': {
    color: '#FF6900',
    path: 'M5.27 24c-.88 0-1.36-.2-1.62-.36-.36-.21-1.02-.75-1.62-2.33A27.06 27.06 0 01.49 12c.02-3.66.59-6.76 1.54-9.3C2.63 1.1 3.29.56 3.65.35 3.91.21 4.39 0 5.27 0c.33 0 .72.03 1.18.1a26.1 26.1 0 018.7 3.3h.01a26.4 26.4 0 017.16 6.01c1.06 1.32 1.19 2.17 1.19 2.59 0 .42-.13 1.27-1.19 2.59a26.4 26.4 0 01-7.16 6h-.01a26.03 26.03 0 01-8.7 3.3c-.46.08-.85.11-1.18.11z',
  },
}

// Lojas com um logótipo melhor no próprio site do que o ícone do separador.
const DIRECT_LOGOS: Record<string, string> = {
  'collectkicks.pt': 'https://collectkicks.pt/cdn/shop/files/logo_s_fundo_180x.png?v=1682350995',
  'footdistrict.com': 'https://footdistrict.com/cdn/shop/files/Logo_7d9512d9-6a65-44bd-b120-1a0ff1b8cbad.png',
  'vans.com': 'https://assets.vans.eu/image/upload/v1755503693/default.svg',
  'asics.com': 'https://www.asics.com/us/mobify/bundle/9379/static/img/global/favicon_512x512.png',
}

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]

const MAX_BYTES = 300_000
const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/

// Proteção extra: uma imagem SVG vinda de fora nunca pode correr código no
// endereço do Parjusto, mesmo que alguém a abra diretamente.
const SAFE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
}

// Fontes a tentar, por ordem: logótipo direto da loja (se houver) e depois
// o ícone do separador do site da loja (serviço de ícones da Google).
function sourceUrls(domain: string): string[] {
  const urls: string[] = []
  const direct = DIRECT_LOGOS[domain]
  if (direct) urls.push(direct)
  urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`)
  return urls
}

const LONG_CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800'

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

// Inicial da loja (ex.: "JD Sports" -> "J"), em cinzento, sem fundo - o
// círculo à volta já é desenhado pela página.
function monogram(domain: string, cacheSeconds: number): Response {
  const letter = escapeXml((domain.replace(/^www\./, '').charAt(0) || '?').toUpperCase())
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="42" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="#5C6770">${letter}</text></svg>`
  return new Response(svg, {
    headers: {
      ...SAFE_HEADERS,
      'Content-Type': 'image/svg+xml',
      'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
    },
  })
}

export async function GET(request: NextRequest) {
  const domain = (request.nextUrl.searchParams.get('domain') ?? '').toLowerCase().trim()
  if (!domain || domain.length > 100 || !DOMAIN_PATTERN.test(domain)) {
    return new Response('Domínio inválido.', { status: 400 })
  }

  if (request.nextUrl.searchParams.get('fallback') === '1') {
    return monogram(domain, 86_400)
  }

  const inline = INLINE_LOGOS[domain]
  if (inline) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${inline.color}"><path d="${inline.path}"/></svg>`
    return new Response(svg, {
      headers: { ...SAFE_HEADERS, 'Content-Type': 'image/svg+xml', 'Cache-Control': LONG_CACHE },
    })
  }

  for (const url of sourceUrls(domain)) {
    try {
      const upstream = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Parjusto/1.0; +https://www.parjusto.pt)' },
      })
      const type = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
      if (!upstream.ok || !ALLOWED_TYPES.includes(type)) continue

      const body = await upstream.arrayBuffer()
      if (body.byteLength === 0 || body.byteLength > MAX_BYTES) continue

      // Browser: 1 dia. Cache da Vercel: 30 dias (e continua a servir a
      // versão guardada enquanto vai buscar uma nova).
      return new Response(body, {
        headers: { ...SAFE_HEADERS, 'Content-Type': type, 'Cache-Control': LONG_CACHE },
      })
    } catch {
      // tenta a fonte seguinte
    }
  }

  return monogram(domain, 3600)
}
