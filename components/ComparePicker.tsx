// components/ComparePicker.tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductWithPrice } from '@/lib/types'
import { searchProducts } from '@/lib/searchProducts'
import { useCompare } from '@/lib/compare'
import { formatPrice } from '@/lib/formatPrice'

export default function ComparePicker({
  allProducts,
  currentSlugs,
}: {
  allProducts: ProductWithPrice[]
  currentSlugs: string[]
}) {
  const router = useRouter()
  const { setCompare } = useCompare()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = searchProducts(allProducts, query, 8).filter(
    (p) => !currentSlugs.includes(p.slug)
  )

  function openPicker() {
    setOpen(true)
    setQuery('')
    setActiveIndex(-1)
    // O input só existe depois deste render; adia o focus para o próximo tick.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function closePicker() {
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
  }

  function selectProduct(slug: string) {
    const nextSlugs = [...currentSlugs, slug].slice(0, 3)
    closePicker()
    setCompare(nextSlugs)
    router.push(`/comparar?produtos=${nextSlugs.join(',')}`, { scroll: false })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      closePicker()
      inputRef.current?.blur()
      return
    }
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectProduct(results[activeIndex].slug)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPicker}
        className="flex min-h-[280px] h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
      >
        <span className="text-2xl leading-none">+</span>
        <span className="text-sm font-semibold">Adicionar produto para comparar</span>
      </button>
    )
  }

  return (
    <div className="flex min-h-[280px] h-full flex-col items-center justify-center rounded-2xl border-2 border-orange-300 bg-white p-4">
      <div className="flex items-center gap-2 w-full">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          // O fecho ao clicar fora é feito com o mesmo truque de onBlur +
          // setTimeout usado na pesquisa da homepage (ProductGrid.tsx): dá
          // tempo ao onMouseDown/preventDefault de cada resultado disparar
          // antes do input perder o foco.
          onBlur={() => setTimeout(closePicker, 150)}
          placeholder="Pesquisar produto..."
          aria-label="Pesquisar produto para adicionar à comparação"
          className="w-full border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={closePicker}
          aria-label="Fechar seletor"
          className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none px-1"
        >
          ×
        </button>
      </div>

      {query.trim().length >= 2 && (
        <div className="w-full mt-3 max-h-[180px] overflow-y-auto flex flex-col gap-1">
          {results.length === 0 ? (
            <p className="text-xs text-gray-400 text-center mt-6">Nenhum produto encontrado.</p>
          ) : (
            results.map((p, index) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectProduct(p.slug)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                  index === activeIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-50 overflow-hidden">
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 truncate">
                    {p.brands?.name}
                  </p>
                  <p className="text-sm font-medium text-gray-900 truncate">{p.model_name}</p>
                </div>
                {p.lowest_price != null && (
                  <span className="text-xs font-semibold text-orange-700 shrink-0">
                    {formatPrice(p.lowest_price)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
