// lib/types.ts
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
  description: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
}

export type ProductWithPrice = Product & {
  brands: Brand
  lowest_price: number | null
  store_count: number | null
  sizes: string[]
}