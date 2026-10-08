// lib/storeLogo.ts
//
// Endereço do logótipo de uma loja. Os logótipos são sempre servidos pelo
// próprio Parjusto (/api/store-logo), nunca diretamente pela Google, pelo
// Simple Icons ou pelo site da loja. Assim:
// - o browser do visitante não contacta nenhum serviço de terceiros (o IP do
//   visitante não é enviado à Google - questão de RGPD);
// - se esses serviços falharem, o logótipo continua a aparecer (fica em
//   cache na Vercel), e na pior das hipóteses aparece a inicial da loja.
//
// De onde vem cada logótipo está em app/api/store-logo/route.ts.

export function storeLogoSrc(domain: string): string {
  return `/api/store-logo?domain=${encodeURIComponent(domain)}`
}

// Usado no onError da imagem: devolve sempre a inicial da loja (nunca falha).
export function storeLogoFallbackSrc(domain: string): string {
  return `/api/store-logo?domain=${encodeURIComponent(domain)}&fallback=1`
}
