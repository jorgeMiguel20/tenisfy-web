// lib/productFilters.ts
//
// Regras dos filtros do catálogo (components/ProductGrid.tsx) e da página
// Promoções (components/PromoGrid.tsx) - ficam aqui para os dois filtrarem
// exatamente da mesma maneira.
import type { ProductWithPrice } from '@/lib/types'
import { GENDER_GROUPS, type GenderGroupValue } from '@/lib/genderGroups'
import { searchProducts } from '@/lib/searchProducts'
import { COLOR_ORDER, mainColor } from '@/lib/colors'

export const GENDER_LABELS: Record<GenderGroupValue, string> = {
  homem: 'Homem',
  mulher: 'Mulher',
  crianca: 'Criança',
}

export type FilterOption = { value: string; display: string; count?: number }

export type AttributeFilters = {
  brands: string[]
  genders: string[]
  categories: string[]
  sizes: string[]
  colors: string[]
  search: string
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

// Cor principal do ténis. A grelha recebe-a já calculada (lib/slimForGrid.ts);
// nos outros sítios calcula-se a partir do texto da cor.
export function productMainColor(p: ProductWithPrice): string | null {
  return p.main_color !== undefined ? p.main_color : mainColor(p.color)
}

// Aplica todos os filtros exceto o de preço. Usada tanto para calcular a
// grelha final (+ filtro de preço) como para calcular os limites (mín/máx)
// do slider de preço a partir do mesmo conjunto de produtos "sobreviventes".
export function applyAttributeFilters(products: ProductWithPrice[], filters: AttributeFilters) {
  let result = products
  if (filters.brands.length > 0) {
    result = result.filter((p) => p.brands?.name && filters.brands.includes(p.brands.name))
  }
  if (filters.genders.length > 0) {
    result = result.filter(
      (p) =>
        p.gender &&
        filters.genders.some((v) => GENDER_GROUPS[v as GenderGroupValue]?.includes(p.gender!))
    )
  }
  if (filters.categories.length > 0) {
    result = result.filter((p) => p.category && filters.categories.includes(p.category))
  }
  if (filters.sizes.length > 0) {
    result = result.filter((p) => p.sizes.some((s) => filters.sizes.includes(s)))
  }
  if (filters.colors.length > 0) {
    result = result.filter((p) => {
      const color = productMainColor(p)
      return color !== null && filters.colors.includes(color)
    })
  }
  if (filters.search.trim() !== '') {
    result = searchProducts(result, filters.search)
  }
  return result
}

export function priceBoundsFromProducts(products: ProductWithPrice[]) {
  const prices = products
    .map((p) => p.lowest_price)
    .filter((p): p is number => p !== null && p !== undefined)
  if (prices.length === 0) return { min: 0, max: 0 }
  return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
}

// Marcas por ordem alfabética, cada uma com o nº de ténis que sobram dos
// OUTROS filtros (a própria marca não conta, para se poder juntar marcas).
// Marcas sem ténis nesse momento escondem-se, a não ser que estejam escolhidas.
export function buildBrandOptions(products: ProductWithPrice[], filters: AttributeFilters): FilterOption[] {
  const counts = new Map<string, number>()
  for (const p of applyAttributeFilters(products, { ...filters, brands: [] })) {
    const name = p.brands?.name
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  for (const name of filters.brands) {
    if (!counts.has(name)) counts.set(name, 0)
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'pt', { sensitivity: 'base' }))
    .map(([name, count]) => ({ value: name, display: name, count }))
}

// Cores (as 13 da lista) com o nº de ténis de cor principal igual a cada uma,
// dentro do que sobra dos outros filtros.
export function buildColorOptions(products: ProductWithPrice[], filters: AttributeFilters): FilterOption[] {
  const counts = new Map<string, number>()
  for (const p of applyAttributeFilters(products, { ...filters, colors: [] })) {
    const color = productMainColor(p)
    if (color) counts.set(color, (counts.get(color) ?? 0) + 1)
  }
  return COLOR_ORDER.filter((c) => (counts.get(c) ?? 0) > 0 || filters.colors.includes(c)).map((c) => ({
    value: c,
    display: c,
    count: counts.get(c) ?? 0,
  }))
}
