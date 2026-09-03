// components/ProductGrid.tsx
'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ProductCard from './ProductCard'
import SortDropdown from './SortDropdown'
import FilterDrawer from './FilterDrawer'
import type { ProductWithPrice } from '@/lib/types'
import { GENDER_GROUPS, GENDER_GROUP_VALUES, type GenderGroupValue } from '@/lib/genderGroups'
import { useCompare } from '@/lib/compare'
import { searchProducts } from '@/lib/searchProducts'

// A pesquisa por foto deixou de estar aqui - passou para o modal unificado
// aberto pela lupa do cabeçalho (ver components/SearchModal.tsx), por isso
// este ficheiro já não precisa do estado/lógica de pesquisa por imagem.

type SortOrder = 'default' | 'price-asc' | 'price-desc' | 'newest'

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'default', label: 'Relevância' },
  { value: 'newest', label: 'Mais recentes' },
  { value: 'price-asc', label: 'Preço menor' },
  { value: 'price-desc', label: 'Preço maior' },
]

const GENDER_LABELS: Record<GenderGroupValue, string> = {
  homem: 'Homem',
  mulher: 'Mulher',
  crianca: 'Criança',
}

const COLOR_ORDER = ['Preto', 'Branco', 'Cinzento', 'Azul', 'Vermelho', 'Verde', 'Bege', 'Multicolor']

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

type AttributeFilters = {
  brands: string[]
  genders: string[]
  categories: string[]
  sizes: string[]
  colors: string[]
  search: string
}

// Aplica todos os filtros exceto o de preço. Usada tanto para calcular a
// grelha final (+ filtro de preço) como para calcular os limites (mín/máx)
// do slider de preço a partir do mesmo conjunto de produtos "sobreviventes".
function applyAttributeFilters(products: ProductWithPrice[], filters: AttributeFilters) {
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
    result = result.filter((p) => p.base_colors?.some((c) => filters.colors.includes(c)))
  }
  if (filters.search.trim() !== '') {
    result = searchProducts(result, filters.search)
  }
  return result
}

function priceBoundsFromProducts(products: ProductWithPrice[]) {
  const prices = products
    .map((p) => p.lowest_price)
    .filter((p): p is number => p !== null && p !== undefined)
  if (prices.length === 0) return { min: 0, max: 0 }
  return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
}

function sidebarItemClass(active: boolean) {
  return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
    active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
    </svg>
  )
}

type PillOption = { value: string; display: string }

function Checkbox({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
        active ? 'border-white' : 'border-gray-300'
      }`}
    >
      {active && (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  )
}

// Grupo de filtro de seleção múltipla (Marca, Género, Categoria, Tamanho, Cor).
// Quando collapsible=true (sidebar), começa fechado e é preciso clicar no
// título para ver as opções. Quando collapsible=false (drawer), está sempre aberto.
function SidebarFilterGroup({
  label,
  options,
  selected,
  onToggle,
  collapsible = false,
}: {
  label: string
  options: PillOption[]
  selected: string[]
  onToggle: (value: string) => void
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(false)

  if (options.length === 0) return null

  const showOptions = !collapsible || open

  return (
    <div className={collapsible ? 'mb-4 border-b border-gray-100 pb-4' : 'mb-6'}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between mb-2"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</p>
          <svg
            className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
          {label}
        </p>
      )}

      {showOptions && (
        <div className="flex flex-col gap-0.5">
          {options.map((option) => {
            const active = selected.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => onToggle(option.value)}
                className={sidebarItemClass(active)}
              >
                <Checkbox active={active} />
                <span>{option.display}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Slider de intervalo com duas pegas (dois <input type="range"> sobrepostos,
// truque comum para simular um "dual range" nativo) + dois campos numéricos
// sincronizados. Os campos guardam texto próprio (minText/maxText) em vez de
// refletirem `value` diretamente, para o utilizador poder apagar o campo e
// escrever um novo número sem ser interrompido a cada tecla; o valor só é
// aplicado (commit) ao sair do campo ou premir Enter.
function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  idPrefix,
}: {
  min: number
  max: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  idPrefix: string
}) {
  const [minText, setMinText] = useState(String(value[0]))
  const [maxText, setMaxText] = useState(String(value[1]))
  const [syncedValue, setSyncedValue] = useState(value)

  if (syncedValue[0] !== value[0] || syncedValue[1] !== value[1]) {
    setSyncedValue(value)
    setMinText(String(value[0]))
    setMaxText(String(value[1]))
  }

  function commitMin(raw: string) {
    const parsed = Math.round(Number(raw))
    if (Number.isNaN(parsed)) {
      setMinText(String(value[0]))
      return
    }
    const clamped = Math.min(Math.max(parsed, min), value[1])
    setMinText(String(clamped))
    onChange([clamped, value[1]])
  }

  function commitMax(raw: string) {
    const parsed = Math.round(Number(raw))
    if (Number.isNaN(parsed)) {
      setMaxText(String(value[1]))
      return
    }
    const clamped = Math.max(Math.min(parsed, max), value[0])
    setMaxText(String(clamped))
    onChange([value[0], clamped])
  }

  const range = Math.max(max - min, 1)
  const leftPct = ((value[0] - min) / range) * 100
  const rightPct = ((value[1] - min) / range) * 100
  const minThumbOnTop = value[0] > min + (max - min) / 2

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <label htmlFor={`${idPrefix}-price-min`} className="sr-only">
            Preço mínimo
          </label>
          <input
            id={`${idPrefix}-price-min`}
            type="number"
            inputMode="numeric"
            min={min}
            max={value[1]}
            value={minText}
            onChange={(e) => setMinText(e.target.value)}
            onBlur={(e) => commitMin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="w-full border border-gray-200 rounded-lg pl-2 pr-5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            €
          </span>
        </div>
        <span className="text-gray-300 text-sm shrink-0">–</span>
        <div className="relative flex-1">
          <label htmlFor={`${idPrefix}-price-max`} className="sr-only">
            Preço máximo
          </label>
          <input
            id={`${idPrefix}-price-max`}
            type="number"
            inputMode="numeric"
            min={value[0]}
            max={max}
            value={maxText}
            onChange={(e) => setMaxText(e.target.value)}
            onBlur={(e) => commitMax(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="w-full border border-gray-200 rounded-lg pl-2 pr-5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            €
          </span>
        </div>
      </div>

      <div className="relative h-7">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gray-200" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-gray-900"
          style={{ left: `${leftPct}%`, width: `${Math.max(rightPct - leftPct, 0)}%` }}
        />
        <input
          type="range"
          className="price-range-input"
          min={min}
          max={max}
          value={value[0]}
          onChange={(e) => {
            const next = Math.min(Number(e.target.value), value[1])
            onChange([next, value[1]])
          }}
          aria-label="Preço mínimo"
          style={{ zIndex: minThumbOnTop ? 5 : 3 }}
        />
        <input
          type="range"
          className="price-range-input"
          min={min}
          max={max}
          value={value[1]}
          onChange={(e) => {
            const next = Math.max(Number(e.target.value), value[0])
            onChange([value[0], next])
          }}
          aria-label="Preço máximo"
          style={{ zIndex: minThumbOnTop ? 3 : 5 }}
        />
      </div>
    </div>
  )
}

// Mesma "casca" colapsável do SidebarFilterGroup, mas para o slider de preço
// em vez de uma lista de checkboxes. Some se não houver variação de preço
// (0 ou 1 produtos no conjunto atual) já que não haveria nada para filtrar.
function PriceFilterGroup({
  label,
  min,
  max,
  value,
  onChange,
  collapsible = false,
  idPrefix,
}: {
  label: string
  min: number
  max: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  collapsible?: boolean
  idPrefix: string
}) {
  const [open, setOpen] = useState(false)

  if (min >= max) return null

  const showOptions = !collapsible || open

  return (
    <div className={collapsible ? 'mb-4 border-b border-gray-100 pb-4' : 'mb-6'}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between mb-2"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</p>
          <svg
            className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">{label}</p>
      )}

      {showOptions && (
        <PriceRangeSlider min={min} max={max} value={value} onChange={onChange} idPrefix={idPrefix} />
      )}
    </div>
  )
}

export default function ProductGrid({
  products,
  belowSearch,
}: {
  products: ProductWithPrice[]
  belowSearch?: React.ReactNode
}) {
  const searchParams = useSearchParams()

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedGenders, setSelectedGenders] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')

  // null = ainda não foi ajustado manualmente, "segue" sempre os limites
  // (mín/máx) calculados a partir dos produtos que sobram dos outros
  // filtros. Ao ajustar manualmente passa a guardar o intervalo escolhido.
  const [selectedPriceRange, setSelectedPriceRange] = useState<[number, number] | null>(null)

  // Estado "rascunho" do painel deslizante (drawer): só é aplicado à grelha
  // quando se clica em "Aplicar filtros". Fechar sem aplicar descarta as alterações.
  const [draftBrands, setDraftBrands] = useState<string[]>([])
  const [draftGenders, setDraftGenders] = useState<string[]>([])
  const [draftCategories, setDraftCategories] = useState<string[]>([])
  const [draftSizes, setDraftSizes] = useState<string[]>([])
  const [draftColors, setDraftColors] = useState<string[]>([])
  const [draftSortOrder, setDraftSortOrder] = useState<SortOrder>('default')
  const [draftPriceRange, setDraftPriceRange] = useState<[number, number] | null>(null)

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Seleção de comparação partilhada com o cabeçalho (lib/compare.ts,
  // localStorage): tanto a barra flutuante abaixo como o link "Comparar" no
  // cabeçalho leem a mesma fonte, para nunca desincronizarem.
  const { compareSlugs, toggleCompare: toggleCompareSlug, setCompare, clearCompare } = useCompare()
  const [compareLimitWarning, setCompareLimitWarning] = useState(false)

  // Sincroniza selectedGenders com o parâmetro ?genero= da URL (links do
  // header, ex: "Homem" -> ?genero=homem). O grupo já inclui Unissexo por
  // regra centralizada em lib/genderGroups.ts. Ajustado durante o render
  // (não num useEffect), que é o padrão recomendado pelo React para reagir
  // a um valor externo que muda.
  const genderParam = searchParams.get('genero')
  const [syncedGenderParam, setSyncedGenderParam] = useState<string | null>(null)
  if (genderParam !== syncedGenderParam) {
    setSyncedGenderParam(genderParam)
    if (genderParam && GENDER_GROUP_VALUES.includes(genderParam as GenderGroupValue)) {
      setSelectedGenders([genderParam])
    }
  }

  // Sincroniza search com o parâmetro ?q= da URL: usado pela pesquisa do
  // hero da homepage (formulário GET simples, sem JS) e pelos chips de
  // sugestão - mesmo padrão de sincronização que ?genero= acima.
  const searchQueryParam = searchParams.get('q')
  const [syncedSearchParam, setSyncedSearchParam] = useState<string | null>(null)
  if (searchQueryParam !== syncedSearchParam) {
    setSyncedSearchParam(searchQueryParam)
    if (searchQueryParam) setSearch(searchQueryParam)
  }

  // Sincroniza compareSlugs com o parâmetro ?comparar= da URL: usado quando se
  // volta ao catálogo a partir de um placeholder "+ Adicionar produto" na
  // página /comparar, para não perder os produtos já selecionados.
  const compareParam = searchParams.get('comparar')
  const [syncedCompareParam, setSyncedCompareParam] = useState<string | null>(null)
  if (compareParam !== syncedCompareParam) {
    setSyncedCompareParam(compareParam)
    if (compareParam) {
      const slugs = compareParam.split(',').filter(Boolean).slice(0, 3)
      if (slugs.length > 0) setCompare(slugs)
    }
  }

  const sidebarPriceBounds = useMemo(
    () =>
      priceBoundsFromProducts(
        applyAttributeFilters(products, {
          brands: selectedBrands,
          genders: selectedGenders,
          categories: selectedCategories,
          sizes: selectedSizes,
          colors: selectedColors,
          search,
        })
      ),
    [products, selectedBrands, selectedGenders, selectedCategories, selectedSizes, selectedColors, search]
  )

  const drawerPriceBounds = useMemo(
    () =>
      priceBoundsFromProducts(
        applyAttributeFilters(products, {
          brands: draftBrands,
          genders: draftGenders,
          categories: draftCategories,
          sizes: draftSizes,
          colors: draftColors,
          search,
        })
      ),
    [products, draftBrands, draftGenders, draftCategories, draftSizes, draftColors, search]
  )

  // Sempre que os limites mudam (porque outro filtro - Marca, Género, etc. -
  // mudou o conjunto de produtos), o intervalo de preço escolhido volta a
  // seguir o intervalo completo. Isto só dispara quando os LIMITES mudam, não
  // quando o próprio slider é arrastado, por isso não interfere ao usar o
  // filtro de preço isoladamente. Ajustado durante o render, tal como a
  // sincronização de género/comparar acima.
  const [syncedSidebarBounds, setSyncedSidebarBounds] = useState(sidebarPriceBounds)
  if (
    syncedSidebarBounds.min !== sidebarPriceBounds.min ||
    syncedSidebarBounds.max !== sidebarPriceBounds.max
  ) {
    setSyncedSidebarBounds(sidebarPriceBounds)
    setSelectedPriceRange([sidebarPriceBounds.min, sidebarPriceBounds.max])
  }

  const [syncedDrawerBounds, setSyncedDrawerBounds] = useState(drawerPriceBounds)
  if (
    syncedDrawerBounds.min !== drawerPriceBounds.min ||
    syncedDrawerBounds.max !== drawerPriceBounds.max
  ) {
    setSyncedDrawerBounds(drawerPriceBounds)
    setDraftPriceRange([drawerPriceBounds.min, drawerPriceBounds.max])
  }

  const effectiveSelectedPriceRange = useMemo<[number, number]>(
    () => selectedPriceRange ?? [sidebarPriceBounds.min, sidebarPriceBounds.max],
    [selectedPriceRange, sidebarPriceBounds]
  )
  const effectiveDraftPriceRange = useMemo<[number, number]>(
    () => draftPriceRange ?? [drawerPriceBounds.min, drawerPriceBounds.max],
    [draftPriceRange, drawerPriceBounds]
  )

  const isPriceFilterActive =
    effectiveSelectedPriceRange[0] > sidebarPriceBounds.min ||
    effectiveSelectedPriceRange[1] < sidebarPriceBounds.max

  function toggleCompare(product: ProductWithPrice) {
    const ok = toggleCompareSlug(product.slug)
    setCompareLimitWarning(!ok)
  }

  const brandOptions = useMemo(() => {
    const uniqueBrands = Array.from(
      new Set(products.map((p) => p.brands?.name).filter(Boolean))
    ) as string[]
    return uniqueBrands.map((name) => ({ value: name, display: name }))
  }, [products])

  const genderOptions = useMemo(() => {
    return GENDER_GROUP_VALUES.filter((value) =>
      products.some((p) => p.gender && GENDER_GROUPS[value].includes(p.gender))
    ).map((value) => ({ value, display: GENDER_LABELS[value] }))
  }, [products])

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[]
    return unique.sort().map((c) => ({ value: c, display: capitalize(c) }))
  }, [products])

  const sizeOptions = useMemo(() => {
    const unique = Array.from(new Set(products.flatMap((p) => p.sizes)))
    return unique.sort((a, b) => parseFloat(a) - parseFloat(b)).map((s) => ({ value: s, display: s }))
  }, [products])

  const colorOptions = useMemo(() => {
    const present = new Set(products.flatMap((p) => p.base_colors ?? []))
    return COLOR_ORDER.filter((c) => present.has(c)).map((c) => ({ value: c, display: c }))
  }, [products])

  const filteredProducts = useMemo(() => {
    let result = applyAttributeFilters(products, {
      brands: selectedBrands,
      genders: selectedGenders,
      categories: selectedCategories,
      sizes: selectedSizes,
      colors: selectedColors,
      search,
    })
    if (isPriceFilterActive) {
      const [priceMin, priceMax] = effectiveSelectedPriceRange
      result = result.filter(
        (p) => p.lowest_price !== null && p.lowest_price >= priceMin && p.lowest_price <= priceMax
      )
    }
    if (sortOrder === 'newest') {
      result = [...result].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } else if (sortOrder === 'price-asc' || sortOrder === 'price-desc') {
      result = [...result].sort((a, b) => {
        if (a.lowest_price === null) return 1
        if (b.lowest_price === null) return -1
        return sortOrder === 'price-asc'
          ? a.lowest_price - b.lowest_price
          : b.lowest_price - a.lowest_price
      })
    }
    return result
  }, [
    products,
    selectedBrands,
    selectedGenders,
    selectedCategories,
    selectedSizes,
    selectedColors,
    search,
    sortOrder,
    isPriceFilterActive,
    effectiveSelectedPriceRange,
  ])

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []

    for (const brand of selectedBrands) {
      chips.push({
        key: `brand-${brand}`,
        label: brand,
        onRemove: () => setSelectedBrands((prev) => prev.filter((v) => v !== brand)),
      })
    }
    for (const gender of selectedGenders) {
      chips.push({
        key: `gender-${gender}`,
        label: GENDER_LABELS[gender as GenderGroupValue] ?? capitalize(gender),
        onRemove: () => setSelectedGenders((prev) => prev.filter((v) => v !== gender)),
      })
    }
    for (const category of selectedCategories) {
      chips.push({
        key: `category-${category}`,
        label: capitalize(category),
        onRemove: () => setSelectedCategories((prev) => prev.filter((v) => v !== category)),
      })
    }
    for (const size of selectedSizes) {
      chips.push({
        key: `size-${size}`,
        label: `Tamanho ${size}`,
        onRemove: () => setSelectedSizes((prev) => prev.filter((v) => v !== size)),
      })
    }
    for (const color of selectedColors) {
      chips.push({
        key: `color-${color}`,
        label: color,
        onRemove: () => setSelectedColors((prev) => prev.filter((v) => v !== color)),
      })
    }
    if (sortOrder !== 'default') {
      const sortLabel = SORT_OPTIONS.find((o) => o.value === sortOrder)?.label ?? ''
      chips.push({ key: 'sort', label: sortLabel, onRemove: () => setSortOrder('default') })
    }
    if (isPriceFilterActive) {
      const [priceMin, priceMax] = effectiveSelectedPriceRange
      chips.push({
        key: 'price',
        label: `${priceMin} € - ${priceMax} €`,
        onRemove: () => setSelectedPriceRange([sidebarPriceBounds.min, sidebarPriceBounds.max]),
      })
    }

    return chips
  }, [
    selectedBrands,
    selectedGenders,
    selectedCategories,
    selectedSizes,
    selectedColors,
    sortOrder,
    isPriceFilterActive,
    effectiveSelectedPriceRange,
    sidebarPriceBounds,
  ])

  const hasActiveFilters = activeChips.length > 0

  function clearFilters() {
    setSelectedBrands([])
    setSelectedGenders([])
    setSelectedCategories([])
    setSelectedSizes([])
    setSelectedColors([])
    setSortOrder('default')
    setSelectedPriceRange(null)
  }

  function openDrawer() {
    setDraftBrands(selectedBrands)
    setDraftGenders(selectedGenders)
    setDraftCategories(selectedCategories)
    setDraftSizes(selectedSizes)
    setDraftColors(selectedColors)
    setDraftSortOrder(sortOrder)
    setDraftPriceRange(selectedPriceRange)
    setDrawerOpen(true)
  }

  function applyDraftFilters() {
    setSelectedBrands(draftBrands)
    setSelectedGenders(draftGenders)
    setSelectedCategories(draftCategories)
    setSelectedSizes(draftSizes)
    setSelectedColors(draftColors)
    setSortOrder(draftSortOrder)
    setSelectedPriceRange(draftPriceRange)
    setDrawerOpen(false)
  }

  function clearDraftFilters() {
    setDraftBrands([])
    setDraftGenders([])
    setDraftCategories([])
    setDraftSizes([])
    setDraftColors([])
    setDraftSortOrder('default')
    setDraftPriceRange(null)
  }

  // mode "sidebar": recolhível, aplica em tempo real.
  // mode "drawer": sempre aberto, opera sobre o estado rascunho (só aplica ao clicar em "Aplicar filtros").
  function renderFilterGroups(mode: 'sidebar' | 'drawer') {
    const isSidebar = mode === 'sidebar'
    const brands = isSidebar ? selectedBrands : draftBrands
    const setBrands = isSidebar ? setSelectedBrands : setDraftBrands
    const genders = isSidebar ? selectedGenders : draftGenders
    const setGenders = isSidebar ? setSelectedGenders : setDraftGenders
    const categories = isSidebar ? selectedCategories : draftCategories
    const setCategories = isSidebar ? setSelectedCategories : setDraftCategories
    const sizes = isSidebar ? selectedSizes : draftSizes
    const setSizes = isSidebar ? setSelectedSizes : setDraftSizes
    const colors = isSidebar ? selectedColors : draftColors
    const setColors = isSidebar ? setSelectedColors : setDraftColors
    const priceRange = isSidebar ? effectiveSelectedPriceRange : effectiveDraftPriceRange
    const setPriceRange = isSidebar ? setSelectedPriceRange : setDraftPriceRange
    const priceBounds = isSidebar ? sidebarPriceBounds : drawerPriceBounds

    return (
      <>
        <SidebarFilterGroup
          label="Marca"
          options={brandOptions}
          selected={brands}
          onToggle={(v) => setBrands((prev) => toggleValue(prev, v))}
          collapsible={isSidebar}
        />
        <SidebarFilterGroup
          label="Género"
          options={genderOptions}
          selected={genders}
          onToggle={(v) => setGenders((prev) => toggleValue(prev, v))}
          collapsible={isSidebar}
        />
        <SidebarFilterGroup
          label="Categoria"
          options={categoryOptions}
          selected={categories}
          onToggle={(v) => setCategories((prev) => toggleValue(prev, v))}
          collapsible={isSidebar}
        />
        <SidebarFilterGroup
          label="Tamanho"
          options={sizeOptions}
          selected={sizes}
          onToggle={(v) => setSizes((prev) => toggleValue(prev, v))}
          collapsible={isSidebar}
        />
        <SidebarFilterGroup
          label="Cor"
          options={colorOptions}
          selected={colors}
          onToggle={(v) => setColors((prev) => toggleValue(prev, v))}
          collapsible={isSidebar}
        />
        <PriceFilterGroup
          label="Preço"
          min={priceBounds.min}
          max={priceBounds.max}
          value={priceRange}
          onChange={setPriceRange}
          collapsible={isSidebar}
          idPrefix={mode}
        />
      </>
    )
  }

  function renderActiveChips() {
    return activeChips.map((chip) => (
      <button
        key={chip.key}
        type="button"
        onClick={chip.onRemove}
        aria-label={`Remover filtro ${chip.label}`}
        className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium pl-3 pr-2.5 py-1.5 rounded-full transition-colors"
      >
        {chip.label}
        <span aria-hidden="true" className="text-gray-300">×</span>
      </button>
    ))
  }

  return (
    <div>
      {/* A pesquisa por texto e por foto passaram para o modal unificado
          aberto pela lupa do cabeçalho (ver components/SearchModal.tsx) -
          já não há um atalho de pesquisa por foto aqui no meio da página. */}
      {belowSearch}

      {/* Barra de filtros única, para todos os tamanhos de ecrã - estilo
          Lacoste: nada de filtros abertos por defeito (a barra lateral
          antiga foi removida), só um botão "Filtros" que abre o painel
          (FilterDrawer), os chips do que já está ativo, e "Limpar tudo".
          Sticky para nunca desaparecer ao fazer scroll da grelha - fica
          logo abaixo do cabeçalho fixo do site. top-20 (80px) e não
          top-16 (64px): o cabeçalho (Header.tsx, também sticky) tem quase
          80px de altura real, não 64px - com top-16 esta barra ficava
          tapada por baixo do cabeçalho ao fazer scroll. */}
      <div className="sticky top-20 z-30 flex flex-wrap items-center gap-2 mb-6 bg-white/95 backdrop-blur-sm py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={openDrawer}
          className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-4 py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors shrink-0"
        >
          <FilterIcon className="h-4 w-4" />
          Filtros{hasActiveFilters ? ` (${activeChips.length})` : ''}
        </button>

        {renderActiveChips()}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors shrink-0"
          >
            Limpar tudo
          </button>
        )}

        <div className="ml-auto flex items-center gap-3 shrink-0">
          <p className="text-sm text-gray-500 hidden sm:block">
            {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
          </p>
          <SortDropdown
            options={SORT_OPTIONS}
            selected={sortOrder}
            onSelect={(value) => setSortOrder(value as SortOrder)}
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <p className="text-gray-400 text-center">Nenhum produto encontrado.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isSelected={compareSlugs.includes(product.slug)}
              onToggleCompare={toggleCompare}
            />
          ))}
        </div>
      )}

      {compareLimitWarning && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-red-50 text-red-700 text-sm font-medium px-4 py-2 rounded-full shadow-lg">
          Só podes comparar até 3 produtos de cada vez.
        </div>
      )}

      {compareSlugs.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl">
          <span className="text-sm font-medium">
            {compareSlugs.length} produto{compareSlugs.length > 1 ? 's' : ''} selecionado{compareSlugs.length > 1 ? 's' : ''}
          </span>
          <Link
            href={`/comparar?produtos=${compareSlugs.join(',')}`}
            className="bg-emerald-50 hover:bg-emerald-100 transition-colors text-emerald-700 border border-emerald-200 text-sm font-semibold px-4 py-1.5 rounded-full"
          >
            Comparar
          </Link>
          <button
            type="button"
            onClick={() => {
              clearCompare()
              setCompareLimitWarning(false)
            }}
            aria-label="Limpar seleção"
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearDraftFilters}
              className="flex-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors py-2.5"
            >
              Limpar filtros
            </button>
            <button
              type="button"
              onClick={applyDraftFilters}
              className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold py-2.5 rounded-full transition-colors"
            >
              Aplicar filtros
            </button>
          </div>
        }
      >
        {/* A ordenação já está sempre disponível no SortDropdown da barra de
            filtros (fora do drawer, em qualquer tamanho de ecrã agora), por
            isso deixou de estar duplicada aqui dentro. */}
        {renderFilterGroups('drawer')}
      </FilterDrawer>
    </div>
  )
}
