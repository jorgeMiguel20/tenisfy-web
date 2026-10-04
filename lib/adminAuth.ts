// lib/adminAuth.ts
import { headers } from 'next/headers'

// Verificação da palavra-passe do admin DENTRO das ações do servidor
// (Server Actions) das páginas /admin.
//
// O proxy.ts já pede a palavra-passe para abrir qualquer página /admin, mas
// uma Server Action é um "botão" que o browser chama por trás - esta
// segunda verificação garante que a ação nunca corre sem a palavra-passe,
// mesmo que alguém a tente chamar por outro caminho.

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export function isValidAdminAuthorization(authHeader: string | null): boolean {
  const expectedPassword = process.env.PRICE_CHECK_PASSWORD
  if (!expectedPassword) return false
  if (!authHeader?.startsWith('Basic ')) return false

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

export async function isAdminRequest(): Promise<boolean> {
  const requestHeaders = await headers()
  return isValidAdminAuthorization(requestHeaders.get('authorization'))
}

export const NOT_AUTHORIZED_ERROR = 'Não autorizado. Volta a abrir a página do admin e entra com a palavra-passe.'
