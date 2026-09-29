// lib/rateLimit.ts
//
// "Limite de pedidos": impede que uma pessoa (ou um robô) use o site em
// excesso, por exemplo para encher a caixa de email de alguém com pedidos de
// confirmação. Usa a tabela rate_limits e a função rate_limit_hit do
// Supabase (ver sql/rate_limits.sql).
import { createHmac } from 'crypto'
import { getServiceClient } from '@/lib/authServer'

// 'ok' = pedido dentro do limite (e já registado); 'limited' = limite
// atingido; 'error' = não foi possível verificar (tratado como recusa por
// quem chama, para o limite nunca ser contornado por uma falha).
export type RateLimitResult = 'ok' | 'limited' | 'error'

export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const supabase = getServiceClient()
  if (!supabase) return 'error'

  const { data, error } = await supabase.rpc('rate_limit_hit', {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.error('Erro no limite de pedidos:', error.message)
    return 'error'
  }
  return data === true ? 'ok' : 'limited'
}

// Impressão digital de um valor (IP, email). Assim a tabela nunca guarda o
// valor em claro. Usa um segredo que só o servidor conhece.
export function fingerprint(value: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'parjusto'
  return createHmac('sha256', secret).update(value).digest('hex').slice(0, 32)
}

// IP de quem fez o pedido, já convertido em impressão digital. Na Vercel o
// cabeçalho x-forwarded-for é definido pela própria Vercel (não pode ser
// falsificado por quem visita).
export function clientFingerprint(requestHeaders: { get(name: string): string | null }): string {
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || requestHeaders.get('x-real-ip') || 'desconhecido'
  return fingerprint(ip)
}
