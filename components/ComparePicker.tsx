// components/ComparePicker.tsx
'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchProducts } from '@/lib/searchProducts'
import { useCompare } from '@/lib/compare'
import { formatPrice } from '@/lib/formatPrice'

// Só os campos que o seletor mostra e pesquisa. A lista inteira vem de
// /api/pesquisa-produtos (guardada 1 hora no servidor) e só é pedida quando a
// pessoa abre o seletor - nunca faz parte da página /comparar.
export type PickerProduct = {
  id: string
  slug: string
  model_name: string
  image_url: string | null
  lowest_price: number | null
  brands: { name: string } | null
}

// Pedido uma só vez por visita: se a pessoa abrir o seletor outra vez (ou
// noutra posição da página) usa-se a lista que já veio.
let productListPromise: Promise<PickerProduct[]> | null = null

function loadProductList(): Promise<PickerProduct[]> {
  if (!productListPromise) {
    productListPromise = fetch('/api/pesquisa-produtos')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<PickerProduct[]>
      })
      .catch((error) => {
        // Se falhar, a próxima abertura do seletor tenta de novo.
        productListPromise = null
        throw error
      })
  }
  return productListPromise
}

export default function ComparePicker({
  allProducts: initialProducts,
  currentSlugs,
  fullWidth = false,
}: {
  // Opcional: se a página já trouxer a lista (versão antiga do /comparar),
  // usa-a; sem ela, o seletor pede-a à API quando é aberto.
  allProducts?: PickerProduct[]
  currentSlugs: string[]
  // Ocupa a largura toda do sítio onde está (lugar vazio da grelha no
  // desktop, linha própria no telemóvel), em vez da largura fixa de 300px.
  fullWidth?: boolean
}) {
  const router = useRouter()
  const { setCompare } = useCompare()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const [allProducts, setAllProducts] = useState<PickerProduct[] | null>(initialProducts ?? null)
  const [loadFailed, setLoadFailed] = useState(false)

  const results = useMemo(
    () =>
      allProducts
        ? searchProducts(allProducts, query, 8).filter((p) => !currentSlugs.includes(p.slug))
        : [],
    [allProducts, query, currentSlugs]
  )

  // Antes do primeiro produto o texto convida a escolher; a partir do
  // primeiro passa a "outro" - o mesmo botão compacto é reutilizado para
  // os dois casos, só muda a palavra.
  const label = currentSlugs.length > 0 ? 'Adicionar outro produto' : 'Adicionar produto para comparar'

  function openPicker() {
    setOpen(true)
    setLoadFailed(false)
    if (!allProducts) {
      loadProductList()
        .then(setAllProducts)
        .catch(() => setLoadFailed(true))
    }
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

  // Botão compacto - do tamanho do próprio texto, não uma caixa grande com
  // contorno tracejado a ocupar o espaço todo (pedido do Jorge, confirmado
  // com mockup).
  if (!open) {
    return (
      <button
        type="button"
        onClick={openPicker}
        // Mesmo estilo das outras peças do site: cantos retos, linha de
        // 1px, 44px de altura, texto #17232B.
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-none border border-[#17232B]/20 bg-white px-4 text-sm font-semibold text-[#17232B] transition-colors hover:border-[#17232B] ${
          fullWidth ? 'w-full' : ''
        }`}
      >
        <span aria-hidden="true" className="text-base leading-none text-[#5C6770]">
          +
        </span>
        {label}
      </button>
    )
  }

  return (
    // Sem contorno/fundo/padding próprios neste wrapper (pedido do Jorge:
    // apareciam "duas caixas" quando o picker abria - esta caixa exterior
    // e o próprio input, cada um com o seu border-gray-900). Agora só o
    // input mostra a caixa (cantos retos, com o seu border) - este div é só
    // um contentor de layout, sem aparência visual própria.
    <div className={fullWidth ? 'w-full' : 'w-[300px] max-w-full'}>
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
          className="min-h-[44px] w-full rounded-none border border-[#17232B] bg-white px-4 text-base text-[#17232B] placeholder:text-[#5C6770] focus:outline-none focus:ring-1 focus:ring-[#17232B] sm:text-sm"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={closePicker}
          aria-label="Fechar seletor"
          className="flex h-11 w-9 shrink-0 items-center justify-center text-lg leading-none text-[#5C6770] transition-colors hover:text-[#17232B]"
        >
          ×
        </button>
      </div>

      {query.trim().length >= 2 && (
        <div className="mt-3 flex max-h-[240px] w-full flex-col gap-1 overflow-y-auto">
          {loadFailed ? (
            <p className="mt-6 text-center text-xs text-[#5C6770]">Não foi possível carregar os produtos. Fecha e abre outra vez.</p>
          ) : !allProducts ? (
            <p className="mt-6 text-center text-xs text-[#5C6770]">A carregar...</p>
          ) : results.length === 0 ? (
            <p className="mt-6 text-center text-xs text-[#5C6770]">Nenhum produto encontrado.</p>
          ) : (
            results.map((p, index) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectProduct(p.slug)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-center gap-3 rounded-none p-2 text-left transition-colors ${
                  index === activeIndex ? 'bg-[#F9FBFC]' : 'hover:bg-[#F9FBFC]'
                }`}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-none bg-[#F9FBFC]">
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]">
                    {p.brands?.name}
                  </p>
                  <p className="truncate text-sm font-medium text-[#17232B]">{p.model_name}</p>
                </div>
                {p.lowest_price != null && (
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-[#17232B]">
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
