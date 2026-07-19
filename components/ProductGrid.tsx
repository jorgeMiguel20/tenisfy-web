// components/ProductGrid.tsx
'use client'

import { useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProductCard from './ProductCard'
import type { ProductWithPrice } from '@/lib/types'

export default function ProductGrid({ products }: { products: ProductWithPrice[] }) {
  const router = useRouter()
  const [selectedBrand, setSelectedBrand] = useState<string>('Todos')
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Correção #2: só mostra sugestões a partir de 2 caracteres
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

  // Correção #4: navegação por teclado (setas + Enter)
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

  return (
    <div>
      <div className="relative max-w-md mx-auto mb-10">
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
          className="w-full border border-gray-200 rounded-full px-5 py-3 text-sm text-center placeholder:text-center focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}