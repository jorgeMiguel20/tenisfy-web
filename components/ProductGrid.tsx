// components/ProductGrid.tsx
'use client'

import { useMemo, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ProductCard from './ProductCard'
import SortDropdown from './SortDropdown'
import FilterDrawer from './FilterDrawer'
import type { ProductWithPrice } from '@/lib/types'
import { getImageEmbedding } from '@/lib/imageEmbedding'

type ImageSearchResult = {
  id: string
  slug: string
  model_name: string
  image_url: string | null
  brand_name: string
  similarity: number
}

type SortOrder = 'default' | 'price-asc' | 'price-desc' | 'newest'

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'default', label: 'Relevância' },
  { value: 'price-asc', label: 'Preço menor' },
  { value: 'price-desc', label: 'Preço maior' },
  { value: 'newest', label: 'Mais recente' },
]

const GENDER_LABELS: Record<string, string> = {
  homem: 'Homem',
  mulher: 'Mulher',
  crianca: 'Criança',
  unissexo: 'Unissexo',
}

const COLOR_ORDER = ['Preto', 'Branco', 'Cinzento', 'Azul', 'Vermelho', 'Verde', 'Bege', 'Multicolor']

const VALID_GENDERS = ['homem', 'mulher', 'crianca', 'unissexo']

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
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
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
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
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
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

export default function ProductGrid({ products }: { products: ProductWithPrice[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedGenders, setSelectedGenders] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')

  // Estado "rascunho" do painel deslizante (drawer): só é aplicado à grelha
  // quando se clica em "Aplicar filtros". Fechar sem aplicar descarta as alterações.
  const [draftBrands, setDraftBrands] = useState<string[]>([])
  const [draftGenders, setDraftGenders] = useState<string[]>([])
  const [draftCategories, setDraftCategories] = useState<string[]>([])
  const [draftSizes, setDraftSizes] = useState<string[]>([])
  const [draftColors, setDraftColors] = useState<string[]>([])
  const [draftSortOrder, setDraftSortOrder] = useState<SortOrder>('default')

  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [imageSearchLoading, setImageSearchLoading] = useState(false)
  const [imageSearchResults, setImageSearchResults] = useState<ImageSearchResult[] | null>(null)
  const [imageSearchError, setImageSearchError] = useState<string | null>(null)

  const [compareSlugs, setCompareSlugs] = useState<string[]>([])
  const [compareLimitWarning, setCompareLimitWarning] = useState(false)

  // Sincroniza selectedGenders com o parâmetro ?genero= da URL (links do header:
  // "Homem" -> homem+unissexo, "Mulher" -> mulher+unissexo, "Crianças" -> crianca)
  // sempre que ele mudar. Ajustado durante o render (não num useEffect), que é o
  // padrão recomendado pelo React para reagir a um valor externo que muda.
  const genderParam = searchParams.get('genero')
  const [syncedGenderParam, setSyncedGenderParam] = useState<string | null>(null)
  if (genderParam !== syncedGenderParam) {
    setSyncedGenderParam(genderParam)
    if (genderParam) {
      const genders = genderParam.split(',').filter((g) => VALID_GENDERS.includes(g))
      if (genders.length > 0) setSelectedGenders(genders)
    }
  }

  function toggleCompare(product: ProductWithPrice) {
    setCompareSlugs((prev) => {
      if (prev.includes(product.slug)) {
        setCompareLimitWarning(false)
        return prev.filter((slug) => slug !== product.slug)
      }
      if (prev.length >= 3) {
        setCompareLimitWarning(true)
        return prev
      }
      setCompareLimitWarning(false)
      return [...prev, product.slug]
    })
  }

  const brandOptions = useMemo(() => {
    const uniqueBrands = Array.from(
      new Set(products.map((p) => p.brands?.name).filter(Boolean))
    ) as string[]
    return uniqueBrands.map((name) => ({ value: name, display: name }))
  }, [products])

  const genderOptions = useMemo(() => {
    const present = new Set(products.map((p) => p.gender).filter(Boolean))
    const values = [
      ...VALID_GENDERS.filter((g) => present.has(g)),
      ...Array.from(present).filter((g) => g && !VALID_GENDERS.includes(g)),
    ] as string[]
    return values.map((g) => ({ value: g, display: GENDER_LABELS[g] ?? capitalize(g) }))
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
    const present = new Set(products.map((p) => p.color).filter(Boolean))
    const values = [
      ...COLOR_ORDER.filter((c) => present.has(c)),
      ...Array.from(present).filter((c) => c && !COLOR_ORDER.includes(c)),
    ] as string[]
    return values.map((c) => ({ value: c, display: c }))
  }, [products])

  const suggestions = useMemo(() => {
    if (search.trim().length < 2) return []
    const query = search.toLowerCase()
    return products
      .filter(
        (p) =>
          p.model_name.toLowerCase().includes(query) ||
          p.brands?.name?.toLowerCase().includes(query)
      )
      .slice(0, 5)
  }, [products, search])

  const filteredProducts = useMemo(() => {
    let result = products
    if (selectedBrands.length > 0) {
      result = result.filter((p) => p.brands?.name && selectedBrands.includes(p.brands.name))
    }
    if (selectedGenders.length > 0) {
      result = result.filter((p) => p.gender && selectedGenders.includes(p.gender))
    }
    if (selectedCategories.length > 0) {
      result = result.filter((p) => p.category && selectedCategories.includes(p.category))
    }
    if (selectedSizes.length > 0) {
      result = result.filter((p) => p.sizes.some((s) => selectedSizes.includes(s)))
    }
    if (selectedColors.length > 0) {
      result = result.filter((p) => p.color && selectedColors.includes(p.color))
    }
    if (search.trim() !== '') {
      const query = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.model_name.toLowerCase().includes(query) ||
          p.brands?.name?.toLowerCase().includes(query)
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
  }, [products, selectedBrands, selectedGenders, selectedCategories, selectedSizes, selectedColors, search, sortOrder])

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
        label: GENDER_LABELS[gender] ?? capitalize(gender),
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

    return chips
  }, [selectedBrands, selectedGenders, selectedCategories, selectedSizes, selectedColors, sortOrder])

  const hasActiveFilters = activeChips.length > 0

  function clearFilters() {
    setSelectedBrands([])
    setSelectedGenders([])
    setSelectedCategories([])
    setSelectedSizes([])
    setSelectedColors([])
    setSortOrder('default')
  }

  function openDrawer() {
    setDraftBrands(selectedBrands)
    setDraftGenders(selectedGenders)
    setDraftCategories(selectedCategories)
    setDraftSizes(selectedSizes)
    setDraftColors(selectedColors)
    setDraftSortOrder(sortOrder)
    setDrawerOpen(true)
  }

  function applyDraftFilters() {
    setSelectedBrands(draftBrands)
    setSelectedGenders(draftGenders)
    setSelectedCategories(draftCategories)
    setSelectedSizes(draftSizes)
    setSelectedColors(draftColors)
    setSortOrder(draftSortOrder)
    setDrawerOpen(false)
  }

  function clearDraftFilters() {
    setDraftBrands([])
    setDraftGenders([])
    setDraftCategories([])
    setDraftSizes([])
    setDraftColors([])
    setDraftSortOrder('default')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      const chosen = suggestions[activeIndex]
      router.push(`/produto/${chosen.slug}`)
      setShowSuggestions(false)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImageSearchLoading(true)
    setImageSearchError(null)
    setImageSearchResults(null)

    try {
      const embedding = await getImageEmbedding(file)

      const response = await fetch('/api/search-by-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedding }),
      })

      const data = await response.json()

      if (!response.ok) {
        setImageSearchError(data.error ?? 'Não foi possível processar a imagem.')
      } else {
        setImageSearchResults(data.results)
      }
    } catch {
      setImageSearchError('Não foi possível analisar a imagem. Tenta outra vez.')
    } finally {
      setImageSearchLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function clearImageSearch() {
    setImageSearchResults(null)
    setImageSearchError(null)
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
      </>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 max-w-lg mx-auto mb-6">
        <div className="relative flex-1">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setActiveIndex(-1)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="O que procuras hoje?"
            className="w-full border border-gray-200 rounded-full pl-10 pr-5 py-3 text-sm text-center placeholder:text-center focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
              {suggestions.map((p, index) => (
                <Link
                  key={p.id}
                  href={`/produto/${p.slug}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                    index === activeIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span>
                    <span className="text-gray-400 mr-1.5">{p.brands?.name}</span>
                    <span className="text-gray-900 font-medium">{p.model_name}</span>
                  </span>
                  {p.lowest_price && (
                    <span className="text-orange-600 font-semibold">
                      {p.lowest_price.toFixed(2)}€
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Botão da câmara, fora e ao lado do input */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageSearchLoading}
          aria-label="Pesquisar por foto"
          className="flex-shrink-0 w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-orange-600 hover:border-orange-300 transition-colors disabled:opacity-50"
        >
          {imageSearchLoading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelected}
          className="hidden"
        />
      </div>

      {imageSearchLoading && (
        <p className="text-center text-sm text-gray-500 mb-6">A analisar o modelo com IA...</p>
      )}

      {imageSearchError && (
        <p className="text-center text-sm text-red-600 mb-6">{imageSearchError}</p>
      )}

      {imageSearchResults ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Resultados da pesquisa por foto ({imageSearchResults.length})
            </p>
            <button
              onClick={clearImageSearch}
              className="text-sm text-orange-600 hover:underline"
            >
              Limpar e ver catálogo completo
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {imageSearchResults.map((r) => (
              <Link
                key={r.id}
                href={`/produto/${r.slug}`}
                className="block rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <div className="aspect-square bg-gray-50 rounded-xl mb-4 overflow-hidden">
                  {r.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt={r.model_name} className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{r.brand_name}</p>
                <p className="font-semibold text-gray-900 mt-0.5">{r.model_name}</p>
                <p className="text-xs text-gray-400 mt-1">{Math.round(r.similarity * 100)}% parecido</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="lg:flex lg:items-start lg:gap-10">
          <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2">
            {renderFilterGroups('sidebar')}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors border-t border-gray-100 pt-4"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpar
              </button>
            )}
          </aside>

          <div className="flex-1 min-w-0">
            {/* Barra de controlos - desktop */}
            <div className="hidden lg:flex items-center justify-end gap-3 mb-6">
              <SortDropdown
                options={SORT_OPTIONS}
                selected={sortOrder}
                onSelect={(value) => setSortOrder(value as SortOrder)}
              />
              <button
                type="button"
                onClick={openDrawer}
                className="inline-flex items-center gap-2 border border-gray-200 bg-white rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors"
              >
                <FilterIcon className="h-4 w-4" />
                Filtrar
              </button>
            </div>

            {/* Barra de controlos - mobile */}
            <div className="flex lg:hidden items-center justify-between gap-2 mb-6">
              <p className="text-sm text-gray-500 shrink-0">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <SortDropdown
                  options={SORT_OPTIONS}
                  selected={sortOrder}
                  onSelect={(value) => setSortOrder(value as SortOrder)}
                  compact
                />
                <button
                  type="button"
                  onClick={openDrawer}
                  className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-4 py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  <FilterIcon className="h-4 w-4" />
                  Filtrar
                </button>
              </div>
            </div>

            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {activeChips.map((chip) => (
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
                ))}
              </div>
            )}

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
          </div>
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
            className="bg-orange-600 hover:bg-orange-700 transition-colors text-white text-sm font-semibold px-4 py-1.5 rounded-full"
          >
            Comparar
          </Link>
          <button
            type="button"
            onClick={() => {
              setCompareSlugs([])
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
        {renderFilterGroups('drawer')}

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Ordenar
          </p>
          <div className="flex flex-col gap-0.5">
            {SORT_OPTIONS.map((option) => {
              const active = draftSortOrder === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDraftSortOrder(option.value)}
                  className={sidebarItemClass(active)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </FilterDrawer>
    </div>
  )
}
