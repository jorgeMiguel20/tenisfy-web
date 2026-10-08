// app/api/store-logo/route.ts
//
// Serve o logótipo de cada loja a partir do próprio Parjusto (ver
// lib/storeLogo.ts). O servidor vai buscar o logótipo uma vez e a Vercel
// guarda-o em cache durante 30 dias - o browser do visitante nunca contacta
// a Google, o Simple Icons nem o site da loja.
//
// Se não conseguir obter o logótipo, devolve uma imagem simples com a
// inicial da loja, para nunca aparecer uma imagem partida.

import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// Marcas globais: logótipo oficial do Simple Icons (com a cor da marca).
const SIMPLE_ICONS: Record<string, string> = {
  'nike.com': 'nike',
  'adidas.pt': 'adidas',
  'newbalance.pt': 'newbalance',
  'zalando.pt': 'zalando',
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

function sourceUrl(domain: string): string {
  const icon = SIMPLE_ICONS[domain]
  if (icon) return `https://cdn.simpleicons.org/${icon}`
  const direct = DIRECT_LOGOS[domain]
  if (direct) return direct
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

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

  try {
    const upstream = await fetch(sourceUrl(domain), {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Parjusto/1.0; +https://www.parjusto.pt)' },
    })
    const type = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!upstream.ok || !ALLOWED_TYPES.includes(type)) return monogram(domain, 3600)

    const body = await upstream.arrayBuffer()
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return monogram(domain, 3600)

    return new Response(body, {
      headers: {
        ...SAFE_HEADERS,
        'Content-Type': type,
        // Browser: 1 dia. Cache da Vercel: 30 dias (e continua a servir a
        // versão guardada enquanto vai buscar uma nova).
        'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800',
      },
    })
  } catch {
    return monogram(domain, 3600)
  }
}
