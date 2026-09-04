// lib/priceScrapers/types.ts
// Tipos partilhados pelos scrapers de preços por loja, usados pela cron job
// em app/api/cron/price-check/route.ts. Cada scraper recebe uma lista de
// ScraperTarget (alvos a verificar, vindos de /api/admin/price-check-targets)
// e devolve só os ScraperResult que conseguiu confirmar com confianca -
// nunca inventa um preco ou disponibilidade que nao encontrou mesmo na
// pagina da loja (ver nota "nunca adivinhar" em lib/priceSync.ts).

export type ScraperTarget = {
  product_offer_id: string
  product_name: string
  product_slug: string | null
  size: string
  store_name: string | null
  url: string
  current_price: number | null
  current_in_stock: boolean | null
  last_checked_at: string | null
}

export type ScraperResult = {
  product_offer_id: string
  checked_price: number | null
  checked_available: boolean | null
  notes?: string | null
}
