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

// "Poupa X €" - sempre face ao preço da LOJA OFICIAL da marca (ex.: adidas
// Oficial para um adidas), nunca face à loja mais cara da lista.
//
// Antes comparava a mais barata com a mais cara, e a mais cara era muitas
// vezes uma loja de revenda (ex.: CollectKicks a 160 € no Campus 00s), o
// que inflacionava a poupança (64 € em vez dos 24 € reais face aos 120 €
// da adidas). O preço da loja oficial é a referência que o cliente
// reconhece (o "preço normal" do ténis) - por isso é a única comparação
// honesta. Sem loja oficial com stock para esse ténis = sem "Poupa"
// (nunca se inventa um preço de referência).
//
// Compara só o preço do ténis (sem portes), como qualquer "preço oficial vs
// preço em promoção". Nunca mostra poupanças abaixo de 1 €.
export type SavingsResult = {
  store: string
  amount: number
  officialStore: string
  officialPrice: number
} | null

// Loja oficial da marca: o nome da loja é "<marca> Oficial" (ex.: "adidas
// Oficial", "Nike Oficial", "New Balance Oficial"). Jordan vende-se na
// loja oficial da Nike.
export function isOfficialStore(storeName: string, brandName: string | null | undefined): boolean {
  if (!brandName) return false
  const brand = brandName.trim().toLowerCase()
  const brandStore = brand === 'jordan' ? 'nike' : brand
  return storeName.trim().toLowerCase() === `${brandStore} oficial`
}

export function computeSavings(
  offers: OfferForSavings[],
  brandName?: string | null
): SavingsResult {
  const official = offers
    .filter((o) => isOfficialStore(o.store, brandName))
    .sort((a, b) => a.price - b.price)[0]
  if (!official) return null

  const cheapest = offers
    .filter((o) => !isOfficialStore(o.store, brandName))
    .sort((a, b) => a.price - b.price)[0]
  if (!cheapest) return null

  const rawSavings = Math.round((official.price - cheapest.price) * 100) / 100
  if (rawSavings < 1) return null

  return {
    store: cheapest.store,
    amount: rawSavings,
    officialStore: official.store,
    officialPrice: official.price,
  }
}

type RawOfferForSavings = {
  price: number
  in_stock: boolean
  stores: { name: string; shipping_base_fee: number | null; shipping_free_threshold: number | null } | null
}

// Agrupa ofertas em stock por loja (preço mais baixo por loja) e calcula a
// poupança - usado nos cards de grelha, que recebem as ofertas ainda "em
// bruto" da query do Supabase em vez de já agrupadas por loja.
export function computeSavingsFromRawOffers(
  offers: RawOfferForSavings[],
  brandName?: string | null
): SavingsResult {
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

  return computeSavings(Array.from(grouped.values()), brandName)
}
