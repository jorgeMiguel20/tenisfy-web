// components/PromoGrid.tsx
'use client'

import { useMemo, useState } from 'react'
import PromoCard from './PromoCard'
import FilterDrawer from './FilterDrawer'
import { FilterIcon, PriceFilterGroup, SidebarFilterGroup } from './ProductGrid'
import type { ProductWithPrice } from '@/lib/types'
import type { GenderGroupValue } from '@/lib/genderGroups'
import { GENDER_GROUP_VALUES, GENDER_GROUPS } from '@/lib/genderGroups'
import { compareSizes } from '@/lib/sizeSort'
import {
  GENDER_LABELS,
  applyAttributeFilters,
  buildBrandOptions,
  buildColorOptions,
  capitalize,
  priceBoundsFromProducts,
  toggleValue,
  type FilterOption,
} from '@/lib/productFilters'

// Listas da página Promoções com os mesmos filtros do catálogo (Marca,
// Género, Categoria, Tamanho, Cor, Preço). Aqui os filtros aplicam-se logo,
// sem passo "rascunho" - a página tem poucos ténis. Os textos de cada cartão
// já vêm prontos de app/promocoes/page.tsx.
export type PromoItem = {
  product: ProductWithPrice
  section: 'below' | 'drops'
  price: number
  referencePrice: number
  note: string
}

const H2 = 'font-display text-2xl font-bold tracking-[-0.01em] text-[#17232B] sm:text-[28px]'
const GRID = 'mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'

export default function PromoGrid({ items }: { items: PromoItem[] }) {
  const products = useMemo(() => items.map((i) => i.product), [items])

  const [brands, setBrands] = useState<string[]>([])
  const [genders, setGenders] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [sizes, setSizes] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filters = useMemo(
    () => ({ brands, genders, categories, sizes, colors, search: '' }),
    [brands, genders, categories, sizes, colors]
  )

  const attributeMatches = useMemo(() => applyAttributeFilters(products, filters), [products, filters])
  const bounds = useMemo(() => priceBoundsFromProducts(attributeMatches), [attributeMatches])

  // O intervalo escolhido nunca sai dos limites do que sobra dos outros filtros.
  const effectiveRange = useMemo<[number, number]>(() => {
    if (!priceRange) return [bounds.min, bounds.max]
    const lo = Math.max(priceRange[0], bounds.min)
    const hi = Math.min(priceRange[1], bounds.max)
    return lo <= hi ? [lo, hi] : [bounds.min, bounds.max]
  }, [priceRange, bounds])
  const priceActive = effectiveRange[0] > bounds.min || effectiveRange[1] < bounds.max

  const visibleIds = useMemo(() => {
    let result = attributeMatches
    if (priceActive) {
      result = result.filter(
        (p) => p.lowest_price !== null && p.lowest_price >= effectiveRange[0] && p.lowest_price <= effectiveRange[1]
      )
    }
    return new Set(result.map((p) => p.id))
  }, [attributeMatches, priceActive, effectiveRange])

  const below = items.filter((i) => i.section === 'below' && visibleIds.has(i.product.id))
  const drops = items.filter((i) => i.section === 'drops' && visibleIds.has(i.product.id))

  // Opções do painel (marcas A–Z e cores com contagem) e as restantes listas.
  const brandOptions = useMemo(() => buildBrandOptions(products, filters), [products, filters])
  const colorOptions = useMemo(() => buildColorOptions(products, filters), [products, filters])
  const genderOptions = useMemo<FilterOption[]>(
    () =>
      GENDER_GROUP_VALUES.filter((v) => products.some((p) => p.gender && GENDER_GROUPS[v].includes(p.gender))).map(
        (v) => ({ value: v, display: GENDER_LABELS[v] })
      ),
    [products]
  )
  const categoryOptions = useMemo<FilterOption[]>(
    () =>
      (Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[])
        .sort()
        .map((c) => ({ value: c, display: capitalize(c) })),
    [products]
  )
  const sizeOptions = useMemo<FilterOption[]>(
    () =>
      Array.from(new Set(products.flatMap((p) => p.sizes)))
        .sort(compareSizes)
        .map((s) => ({ value: s, display: s })),
    [products]
  )

  const chips: { key: string; label: string; onRemove: () => void }[] = []
  for (const b of brands) chips.push({ key: `b-${b}`, label: b, onRemove: () => setBrands((p) => p.filter((v) => v !== b)) })
  for (const g of genders)
    chips.push({
      key: `g-${g}`,
      label: GENDER_LABELS[g as GenderGroupValue] ?? capitalize(g),
      onRemove: () => setGenders((p) => p.filter((v) => v !== g)),
    })
  for (const c of categories)
    chips.push({ key: `c-${c}`, label: capitalize(c), onRemove: () => setCategories((p) => p.filter((v) => v !== c)) })
  for (const s of sizes)
    chips.push({ key: `s-${s}`, label: `Tamanho ${s}`, onRemove: () => setSizes((p) => p.filter((v) => v !== s)) })
  for (const c of colors)
    chips.push({ key: `k-${c}`, label: c, onRemove: () => setColors((p) => p.filter((v) => v !== c)) })
  if (priceActive)
    chips.push({
      key: 'price',
      label: `${effectiveRange[0]} € - ${effectiveRange[1]} €`,
      onRemove: () => setPriceRange(null),
    })

  function clearAll() {
    setBrands([])
    setGenders([])
    setCategories([])
    setSizes([])
    setColors([])
    setPriceRange(null)
  }

  const total = below.length + drops.length

  return (
    <div>
      <div className="mt-8 flex flex-wrap items-center gap-2 border-y border-[#17232B]/10 py-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-none bg-[#17232B] px-4 text-sm font-medium text-white transition-colors hover:bg-[#17232B]/85"
        >
          <FilterIcon className="h-4 w-4" />
          Filtros{chips.length > 0 ? ` (${chips.length})` : ''}
        </button>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remover filtro ${chip.label}`}
            className="inline-flex items-center gap-1.5 rounded-none bg-[#17232B] py-1.5 pl-3 pr-2.5 text-sm font-medium text-white transition-colors hover:bg-[#17232B]/85"
          >
            <span>{chip.label}</span>
            <span aria-hidden="true" className="text-gray-300">×</span>
          </button>
        ))}
        {chips.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 text-sm font-medium text-[#5C6770] underline decoration-[#5C6770]/40 underline-offset-4 transition-colors hover:text-[#17232B]"
          >
            Limpar tudo
          </button>
        )}
        <p className="ml-auto hidden text-sm text-[#5C6770] sm:block">
          {total} produto{total !== 1 ? 's' : ''}
        </p>
      </div>

      {total === 0 && (
        <p className="py-16 text-center text-[#5C6770]">
          Nenhum ténis em promoção com estes filtros.{' '}
          <button type="button" onClick={clearAll} className="font-medium text-[#17232B] underline underline-offset-4">
            Limpar filtros
          </button>
        </p>
      )}

      {below.length > 0 && (
        // Sem título nem frase própria (pedido de marketing): a frase do
        // topo da página já explica esta lista, e cada cartão diz em que
        // loja está e qual o preço na loja oficial.
        <section className="mt-10">
          <div className={GRID}>
            {below.map((item) => (
              <PromoCard
                key={item.product.id}
                slug={item.product.slug}
                imageUrl={item.product.image_url}
                brandName={item.product.brands?.name}
                modelName={item.product.model_name}
                price={item.price}
                referencePrice={item.referencePrice}
                note={item.note}
              />
            ))}
          </div>
        </section>
      )}

      {drops.length > 0 && (
        <section className={`mt-12 pt-10 ${below.length > 0 ? 'border-t border-[#17232B]/10' : ''}`}>
          <h2 className={H2}>Desceram nos últimos 14 dias</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#5C6770]">
            O melhor preço de hoje, comparado com o melhor preço registado há até 14 dias.
          </p>
          <div className={GRID}>
            {drops.map((item) => (
              <PromoCard
                key={item.product.id}
                slug={item.product.slug}
                imageUrl={item.product.image_url}
                brandName={item.product.brands?.name}
                modelName={item.product.model_name}
                price={item.price}
                referencePrice={item.referencePrice}
                note={item.note}
              />
            ))}
          </div>
        </section>
      )}

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearAll}
              className="min-h-[44px] flex-1 text-sm font-medium text-[#5C6770] underline decoration-[#5C6770]/40 underline-offset-4 transition-colors hover:text-[#17232B]"
            >
              Limpar filtros
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              disabled={total === 0}
              className="min-h-[44px] flex-1 rounded-none bg-[#123F3A] text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b] disabled:cursor-not-allowed disabled:bg-[#17232B]/20 disabled:text-[#17232B]/60"
            >
              {total === 0 ? 'Sem resultados' : `Ver ${total} produto${total !== 1 ? 's' : ''}`}
            </button>
          </div>
        }
      >
        <SidebarFilterGroup
          label="Marca"
          options={brandOptions}
          selected={brands}
          onToggle={(v) => setBrands((p) => toggleValue(p, v))}
          collapsible
          defaultOpen
          initialVisible={6}
        />
        <SidebarFilterGroup
          label="Género"
          options={genderOptions}
          selected={genders}
          onToggle={(v) => setGenders((p) => toggleValue(p, v))}
          collapsible
        />
        <SidebarFilterGroup
          label="Categoria"
          options={categoryOptions}
          selected={categories}
          onToggle={(v) => setCategories((p) => toggleValue(p, v))}
          collapsible
        />
        <SidebarFilterGroup
          label="Tamanho"
          options={sizeOptions}
          selected={sizes}
          onToggle={(v) => setSizes((p) => toggleValue(p, v))}
          collapsible
          variant="sizes"
        />
        <SidebarFilterGroup
          label="Cor"
          options={colorOptions}
          selected={colors}
          onToggle={(v) => setColors((p) => toggleValue(p, v))}
          collapsible
          variant="colors"
        />
        <PriceFilterGroup
          label="Preço"
          min={bounds.min}
          max={bounds.max}
          value={effectiveRange}
          onChange={setPriceRange}
          collapsible
          idPrefix="promo"
        />
      </FilterDrawer>
    </div>
  )
}
