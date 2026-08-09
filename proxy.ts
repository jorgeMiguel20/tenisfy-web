// proxy.ts
import { NextRequest, NextResponse } from 'next/server'

// Protege tudo em /admin com HTTP Basic Auth (o browser mostra a caixa de
// login nativa). Só a password importa - o utilizador pode ser qualquer
// texto, para não ser preciso configurar mais do que uma variável.
function isAuthorized(request: NextRequest): boolean {
  const expectedPassword = process.env.PRICE_CHECK_PASSWORD
  if (!expectedPassword) return false

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Basic ')) return false

  const decoded = atob(authHeader.slice('Basic '.length))
  const separatorIndex = decoded.indexOf(':')
  const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : decoded

  return password === expectedPassword
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
