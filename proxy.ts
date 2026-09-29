// proxy.ts
import { NextRequest, NextResponse } from 'next/server'

// Compara duas palavras-passe sem revelar (pelo tempo que demora) quantas
// letras estavam certas.
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

// Protege tudo em /admin com HTTP Basic Auth (o browser mostra a caixa de
// login nativa). Só a password importa - o utilizador pode ser qualquer
// texto, para não ser preciso configurar mais do que uma variável.
function isAuthorized(request: NextRequest): boolean {
  const expectedPassword = process.env.PRICE_CHECK_PASSWORD
  if (!expectedPassword) return false

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Basic ')) return false

  // Um cabeçalho mal formado (texto que não é base64) faz o atob falhar;
  // isso conta como "não autorizado", não como erro do servidor.
  let decoded: string
  try {
    decoded = atob(authHeader.slice('Basic '.length).trim())
  } catch {
    return false
  }

  const separatorIndex = decoded.indexOf(':')
  const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : decoded

  return safeEqual(password, expectedPassword)
}

export function proxy(request: NextRequest) {
  if (isAuthorized(request)) {
    return NextResponse.next()
  }

  return new NextResponse('Autenticação necessária.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Área restrita"' },
  })
}

export const config = {
  matcher: '/admin/:path*',
}
