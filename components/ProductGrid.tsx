// components/ProductGrid.tsx
'use client'

import { useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProductCard from './ProductCard'
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

export default function ProductGrid({ products }: { products: ProductWithPrice[] }) {
  const router = useRouter()
  const [selectedBrand, setSelectedBrand] = useState<string>('Todos')
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const [imageSearchLoading, setImageSearchLoading] = useState(false)
  const [imageSearchResults, setImageSearchResults] = useState<ImageSearchResult[] | null>(null)
  const [imageSearchError, setImageSearchError] = useState<string | null>(null)

  const [compareSlugs, setCompareSlugs] = useState<string[]>([])
  const [compareLimitWarning, setCompareLimitWarning] = useState(false)

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

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: products.length }
    for (const p of products) {
      const brandName = p.brands?.name
      if (!brandName) continue
      counts[brandName] = (counts[brandName] ?? 0) + 1
    }
    return counts
  }, [products])

  const brands = useMemo(() => {
    const uniqueBrands = Array.from(
      new Set(products.map((p) => p.brands?.name).filter(Boolean))
    ) as string[]
    return ['Todos', ...uniqueBrands]
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
    if (search.trim() !== '') {
      const query = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.model_name.toLowerCase().includes(query) ||
          p.brands?.name?.toLowerCase().includes(query)
      )
    }
    return result
  }, [products, selectedBrand, search])

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

  return (
    <div>
      <div className="flex items-center gap-3 max-w-lg mx-auto mb-10">
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

      <div className="flex justify-center mb-8">
        <button
          type="button"
          onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors"
        >
          Ver todos
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {imageSearchError && (
        <p className="text-center text-sm text-red-600 mb-6">{imageSearchError}</p>
      )}

      {imageSearchResults && (
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
      )}

      {!imageSearchResults && (
        <div ref={gridRef}>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  selectedBrand === brand
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {brand} ({brandCounts[brand] ?? 0})
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <p className="text-gray-400 text-center">Nenhum produto encontrado.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
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
    </div>
  )
}