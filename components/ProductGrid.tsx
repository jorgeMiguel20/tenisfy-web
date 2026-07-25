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

type SortOrder = 'default' | 'newest' | 'price-asc' | 'price-desc'

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'default', label: 'Em destaque' },
  { value: 'newest', label: 'Mais Recentes' },
  { value: 'price-asc', label: 'Preço: mais baixo ↓' },
  { value: 'price-desc', label: 'Preço: mais alto ↑' },
]

const GENDER_LABELS: Record<string, string> = {
  homem: 'Homem',
  mulher: 'Mulher',
  crianca: 'Criança',
  unissexo: 'Unissexo',
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function sidebarItemClass(active: boolean) {
  return `flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
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

type PillOption = { value: string; display: string; count?: number }

function SidebarFilterGroup({
  label,
  options,
  selected,
  onSelect,
  collapsible = false,
}: {
  label: string
  options: PillOption[]
  selected: string
  onSelect: (value: string) => void
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(false)

  if (options.length <= 1) return null

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
            const active = selected === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className={sidebarItemClass(active)}
              >
                <span>{option.display}</span>
                {option.count !== undefined && (
                  <span className={active ? 'text-gray-300' : 'text-gray-400'}>
                    ({option.count})
                  </span>
                )}
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
  const [selectedBrand, setSelectedBrand] = useState<string>('Todos')
  const [selectedGender, setSelectedGender] = useState<string>('Todos')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [selectedSize, setSelectedSize] = useState<string>('Todos')
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')
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

  // Sincroniza selectedGender com o parâmetro ?genero= da URL (links "Homens/Mulheres/Crianças"
  // do header) sempre que ele mudar, sem precisar de um useEffect (padrão recomendado pelo React
  // para ajustar estado com base numa prop/valor externo que muda).
  const genderParam = searchParams.get('genero')
  const [syncedGenderParam, setSyncedGenderParam] = useState<string | null>(null)
  if (genderParam !== syncedGenderParam) {
    setSyncedGenderParam(genderParam)
    if (genderParam && ['homem', 'mulher', 'crianca', 'unissexo'].includes(genderParam)) {
      setSelectedGender(genderParam)
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
    const counts: Record<string, number> = {}
    for (const p of products) {
      const name = p.brands?.name
      if (!name) continue
      counts[name] = (counts[name] ?? 0) + 1
    }
    const uniqueBrands = Array.from(
      new Set(products.map((p) => p.brands?.name).filter(Boolean))
    ) as string[]
    return [
      { value: 'Todos', display: 'Todos', count: products.length },
      ...uniqueBrands.map((name) => ({ value: name, display: name, count: counts[name] })),
    ]
  }, [products])

  const genderOptions = useMemo(() => {
    const order = ['homem', 'mulher', 'crianca', 'unissexo']
    const counts: Record<string, number> = {}
    for (const p of products) {
      if (!p.gender) continue
      counts[p.gender] = (counts[p.gender] ?? 0) + 1
    }
    const values = [
      ...order.filter((g) => counts[g]),
      ...Object.keys(counts).filter((g) => !order.includes(g)),
    ]
    return [
      { value: 'Todos', display: 'Todos', count: products.length },
      ...values.map((g) => ({ value: g, display: GENDER_LABELS[g] ?? capitalize(g), count: counts[g] })),
    ]
  }, [products])

  const categoryOptions = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products) {
      if (!p.category) continue
      counts[p.category] = (counts[p.category] ?? 0) + 1
    }
    const values = Object.keys(counts).sort()
    return [
      { value: 'Todos', display: 'Todos', count: products.length },
      ...values.map((c) => ({ value: c, display: capitalize(c), count: counts[c] })),
    ]
  }, [products])

  const sizeOptions = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products) {
      for (const size of p.sizes) {
        counts[size] = (counts[size] ?? 0) + 1
      }
    }
    const values = Object.keys(counts).sort((a, b) => parseFloat(a) - parseFloat(b))
    return [
      { value: 'Todos', display: 'Todos', count: products.length },
      ...values.map((s) => ({ value: s, display: s, count: counts[s] })),
    ]
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
    if (selectedBrand !== 'Todos') {
      result = result.filter((p) => p.brands?.name === selectedBrand)
    }
    if (selectedGender !== 'Todos') {
      result = result.filter((p) => p.gender === selectedGender)
    }
    if (selectedCategory !== 'Todos') {
      result = result.filter((p) => p.category === selectedCategory)
    }
    if (selectedSize !== 'Todos') {
      result = result.filter((p) => p.sizes.includes(selectedSize))
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
  }, [products, selectedBrand, selectedGender, selectedCategory, selectedSize, search, sortOrder])

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []

    if (selectedBrand !== 'Todos') {
      chips.push({ key: 'brand', label: selectedBrand, onRemove: () => setSelectedBrand('Todos') })
    }
    if (selectedGender !== 'Todos') {
      chips.push({
        key: 'gender',
        label: GENDER_LABELS[selectedGender] ?? capitalize(selectedGender),
        onRemove: () => setSelectedGender('Todos'),
      })
    }
    if (selectedCategory !== 'Todos') {
      chips.push({
        key: 'category',
        label: capitalize(selectedCategory),
        onRemove: () => setSelectedCategory('Todos'),
      })
    }
    if (selectedSize !== 'Todos') {
      chips.push({ key: 'size', label: `Tamanho ${selectedSize}`, onRemove: () => setSelectedSize('Todos') })
    }
    if (sortOrder !== 'default') {
      const sortLabel = SORT_OPTIONS.find((o) => o.value === sortOrder)?.label ?? ''
      chips.push({ key: 'sort', label: sortLabel, onRemove: () => setSortOrder('default') })
    }

    return chips
  }, [selectedBrand, selectedGender, selectedCategory, selectedSize, sortOrder])

  const hasActiveFilters = activeChips.length > 0

  function clearFilters() {
    setSelectedBrand('Todos')
    setSelectedGender('Todos')
    setSelectedCategory('Todos')
    setSelectedSize('Todos')
    setSortOrder('default')
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

  function renderFilterGroups(collapsible: boolean) {
    return (
      <>
        <SidebarFilterGroup
          label="Marca"
          options={brandOptions}
          selected={selectedBrand}
          onSelect={setSelectedBrand}
          collapsible={collapsible}
        />
        <SidebarFilterGroup
          label="Género"
          options={genderOptions}
          selected={selectedGender}
          onSelect={setSelectedGender}
          collapsible={collapsible}
        />
        <SidebarFilterGroup
          label="Categoria"
          options={categoryOptions}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          collapsible={collapsible}
        />
        <SidebarFilterGroup
          label="Tamanho"
          options={sizeOptions}
          selected={selectedSize}
          onSelect={setSelectedSize}
          collapsible={collapsible}
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
            {renderFilterGroups(true)}

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
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 border border-gray-200 bg-white rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors"
              >
                <FilterIcon className="h-4 w-4" />
                Filtra
              </button>
            </div>

            {/* Barra de controlos - mobile */}
            <div className="flex lg:hidden items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-4 py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                <FilterIcon className="h-4 w-4" />
                Filtrar &amp; Ordenar
              </button>
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

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {renderFilterGroups(false)}
        <SidebarFilterGroup
          label="Ordenar"
          options={SORT_OPTIONS.map((o) => ({ value: o.value, display: o.label }))}
          selected={sortOrder}
          onSelect={(value) => setSortOrder(value as SortOrder)}
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors border-t border-gray-100 pt-4"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpar filtros
          </button>
        )}
      </FilterDrawer>
    </div>
  )
}
