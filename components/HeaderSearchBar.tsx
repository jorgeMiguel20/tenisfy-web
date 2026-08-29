// components/HeaderSearchBar.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { closeSearchModal } from '@/lib/searchModal'
import { getImageEmbedding } from '@/lib/imageEmbedding'

type ImageSearchResult = {
  id: string
  slug: string
  model_name: string
  image_url: string | null
  brand_name: string
  similarity: number
}

// Barra de pesquisa que substitui o menu no cabeçalho quando a lupa é
// clicada - visual idêntico ao da barra do Hero (components/HomeHero.tsx:
// mesmo pill branco, mesmo botão de câmara preto, mesmo botão de submeter
// laranja), só que fica encaixada no próprio cabeçalho em vez de abrir um
// modal ou painel flutuante por cima da página.
export default function HeaderSearchBar() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [imageResults, setImageResults] = useState<ImageSearchResult[] | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  function handleClose() {
    closeSearchModal()
    setQuery('')
    setImageLoading(false)
    setImageResults(null)
    setImageError(null)
  }

  // Fecha com Esc ou ao clicar fora da barra, como é hábito numa pesquisa
  // expansível de cabeçalho.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    handleClose()
    router.push(trimmed ? `/catalogo?q=${encodeURIComponent(trimmed)}` : '/catalogo')
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImageLoading(true)
    setImageError(null)
    setImageResults(null)

    try {
      const embedding = await getImageEmbedding(file)

      const response = await fetch('/api/search-by-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedding }),
      })

      const data = await response.json()

      if (!response.ok) {
        setImageError(data.error ?? 'Não foi possível processar a imagem.')
      } else {
        setImageResults(data.results)
      }
    } catch {
      setImageError('Não foi possível analisar a imagem. Tenta outra vez.')
    } finally {
      setImageLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const showDropdown = imageLoading || !!imageError || !!imageResults

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <form
        onSubmit={handleTextSubmit}
        className="flex items-center gap-2 bg-white rounded-full p-1.5 pl-5 shadow-lg border border-gray-100 w-full max-w-xl"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisa por modelo, marca ou foto..."
          autoFocus
          className="flex-1 min-w-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageLoading}
          aria-label="Pesquisar por foto"
          className="w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors flex items-center justify-center text-white shrink-0 disabled:opacity-50"
        >
          {imageLoading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          )}
        </button>
        <button
          type="submit"
          aria-label="Pesquisar"
          className="w-10 h-10 rounded-full bg-orange-600 hover:bg-orange-700 transition-colors flex items-center justify-center text-white shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar pesquisa"
          className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
      />

      {/* Resultado da pesquisa por foto: um pequeno dropdown ancorado à
          barra, não um pop-up ou modal a cobrir a página. */}
      {showDropdown && (
        <div className="absolute left-0 top-full mt-2 w-full max-w-xl rounded-2xl bg-white shadow-xl border border-gray-100 p-4 z-50">
          {imageLoading ? (
            <p className="text-sm text-gray-500 text-center py-1">A analisar a fotografia...</p>
          ) : imageError ? (
            <p className="text-sm text-red-600 text-center py-1">{imageError}</p>
          ) : imageResults && imageResults.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-1">Não encontrámos nenhum modelo parecido.</p>
          ) : (
            <div className="space-y-1">
              {imageResults!.map((r) => (
                <Link
                  key={r.id}
                  href={`/produto/${r.slug}`}
                  onClick={handleClose}
                  className="flex items-center gap-3 rounded-xl p-2 -mx-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-50 overflow-hidden">
                    {r.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image_url} alt={r.model_name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{r.brand_name}</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.model_name}</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400 shrink-0">
                    {Math.round(r.similarity * 100)}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
