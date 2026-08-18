// lib/offerUrl.ts
export type OfferWithAffiliateUrl = {
  affiliate_url: string
  affiliate_url_template: string | null
}

// Se a loja tiver um template de afiliado configurado (ver Divulgação de
// Afiliados), substitui {url} pelo link direto da oferta; caso contrário
// (hoje, para todas as lojas) usa o link direto tal como sempre foi.
export function buildOfferUrl(offer: OfferWithAffiliateUrl): string {
  if (!offer.affiliate_url_template) return offer.affiliate_url
  return offer.affiliate_url_template.replace('{url}', encodeURIComponent(offer.affiliate_url))
}
