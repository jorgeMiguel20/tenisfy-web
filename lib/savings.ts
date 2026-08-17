// lib/savings.ts
// Lógica de "Poupa X€" extraída de app/produto/[slug]/page.tsx para poder
// ser reutilizada nos cards de grelha (homepage, favoritos, modelos
// semelhantes) sem duplicar o cálculo.

export type OfferForSavings = {
  store: string
  price: number
  shipping_base_fee: number | null
  shipping_free_threshold: number | null
}

// Custo de envio calculável (número) para uma oferta, ou null se não houver
// dados fiáveis suficientes para somar ao preço (ex: Nike depende do estatuto
// de membro; outras lojas só têm o limiar de grátis mas não a taxa abaixo dele).
export function getShippingCost(offer: OfferForSavings): number | null {
  const { shipping_free_threshold: threshold, shipping_base_fee: fee, store, price } = offer

  if (store === 'Nike Oficial') return null
  if (threshold == null) return null
  if (price >= threshold) return 0

  return fee ?? null
}

export type SavingsResult = { store: string; amount: number } | null

// Poupança real: compara o custo total (preço + portes) entre a oferta mais
// barata e a mais cara, só entre ofertas com portes calculáveis (ver
// getShippingCost). Nunca mostra poupanças abaixo de 1€.
export function computeSavings(offers: OfferForSavings[]): SavingsResult {
  const offersWithTotalCost = offers
    .map((offer) => {
      const shippingCost = getShippingCost(offer)
      return shippingCost == null ? null : { offer, total: offer.price + shippingCost }
    })
    .filter((o): o is { offer: OfferForSavings; total: number } => o !== null)
    .sort((a, b) => a.total - b.total)

  if (offersWithTotalCost.length <= 1) return null

  const cheapest = offersWithTotalCost[0]
  const mostExpensive = offersWithTotalCost[offersWithTotalCost.length - 1]
  const rawSavings = Math.round((mostExpensive.total - cheapest.total) * 100) / 100

  if (rawSavings < 1) return null

  return { store: cheapest.offer.store, amount: rawSavings }
}

type RawOfferForSavings = {
  price: number
  in_stock: boolean
  stores: { name: string; shipping_base_fee: number | null; shipping_free_threshold: number | null } | null
}

// Agrupa ofertas em stock por loja (preço mais baixo por loja) e calcula a
// poupança - usado nos cards de grelha, que recebem as ofertas ainda "em
// bruto" da query do Supabase em vez de já agrupadas por loja.
export function computeSavingsFromRawOffers(offers: RawOfferForSavings[]): SavingsResult {
  const grouped = new Map<string, OfferForSavings>()

  for (const offer of offers) {
    if (!offer.in_stock || !offer.stores) continue

    const existing = grouped.get(offer.stores.name)
    if (!existing || offer.price < existing.price) {
      grouped.set(offer.stores.name, {
        store: offer.stores.name,
        price: offer.price,
        shipping_base_fee: offer.stores.shipping_base_fee,
        shipping_free_threshold: offer.stores.shipping_free_threshold,
      })
    }
  }

  return computeSavings(Array.from(grouped.values()))
}
