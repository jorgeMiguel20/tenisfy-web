// lib/types.ts
import type { SavingsResult } from './savings'
import type { PriceDropResult } from './priceDrop'

export type Brand = {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

export type Product = {
  id: string
  brand_id: string
  model_name: string
  slug: string
  category: string | null
  gender: string | null
  color: string | null
  base_colors: string[] | null
  color_variant_group: string | null
  image_urls: string[] | null
  description: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
}

export type ProductOfferWithStore = {
  id: string
  price: number
  in_stock: boolean
  store_id: string
  size: string
  last_checked_at: string
  affiliate_url: string
  stores: {
    name: string
    shipping_base_fee: number | null
    shipping_free_threshold: number | null
    affiliate_url_template: string | null
  } | null
}

export type ProductWithPrice = Product & {
  brands: Brand
  lowest_price: number | null
  store_count: number | null
  sizes: string[]
  savings?: SavingsResult
  priceDrop?: PriceDropResult
  // Presente em tempo de execução (vem direto da query em
  // lib/getProductsWithPrice.ts) mas opcional no tipo - nem todos os sítios
  // que usam ProductWithPrice precisam do detalhe por oferta/loja.
  product_offers?: ProductOfferWithStore[]
}