// lib/priceSync.ts
// Partilhado pelos endpoints /api/admin/price-check-* (recolha automática de
// preços). Nunca usado no browser - só chamadas servidor-a-servidor do
// agente externo, autenticadas por Bearer token (PRICE_SYNC_API_KEY),
// distinta da PRICE_CHECK_PASSWORD usada pela página /admin/precos (essa é
// para acesso humano por browser via Basic Auth).

import type { NextRequest } from 'next/server'

export function isPriceSyncAuthorized(request: NextRequest): boolean {
  const expectedKey = process.env.PRICE_SYNC_API_KEY
  if (!expectedKey) return false // fail-closed: sem chave configurada, nunca autoriza

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  return authHeader.slice('Bearer '.length) === expectedKey
}

// Preço abaixo disto é tratado como leitura implausível mesmo sem um
// previous_price para comparar (ex: primeira verificação de uma oferta nova,
// ou a extração devolveu um número claramente errado tipo "1" ou "0.5").
// Valor de exemplo - o catálogo de hoje não tem nada abaixo de ~45€; ajusta
// se um dia venderes algo legitimamente mais barato que isto.
export const MIN_PLAUSIBLE_PRICE = 5

// Variação (para cima ou para baixo) acima disto face ao preço anterior é
// tratada como suspeita em vez de aprovável automaticamente - protege contra
// erros de leitura tipo apanhar "19" em vez de "119,99".
export const MAX_PLAUSIBLE_VARIATION_RATIO = 0.5

export type PriceSanityResult = { suspicious: boolean; reason: string | null }

export function checkPriceSanity(previousPrice: number, checkedPrice: number): PriceSanityResult {
  if (checkedPrice < MIN_PLAUSIBLE_PRICE) {
    return {
      suspicious: true,
      reason: `Preço lido (${checkedPrice}€) está abaixo do mínimo plausível (${MIN_PLAUSIBLE_PRICE}€).`,
    }
  }

  if (previousPrice > 0) {
    const ratio = Math.abs(checkedPrice - previousPrice) / previousPrice
    if (ratio > MAX_PLAUSIBLE_VARIATION_RATIO) {
      const pct = Math.round(ratio * 100)
      return {
        suspicious: true,
        reason: `Variação de preço fora do plausível: ${previousPrice}€ → ${checkedPrice}€ (${pct}%).`,
      }
    }
  }

  return { suspicious: false, reason: null }
}
