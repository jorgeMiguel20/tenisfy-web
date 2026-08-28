// components/SearchModal.tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { closeSearchModal, useSearchModalOpen } from '@/lib/searchModal'
import { getImageEmbedding } from '@/lib/imageEmbedding'

type ImageSearchResult = {
  id: string
  slug: string
  model_name: string
  image_url: string | null
  brand_name: string
  similarity: number
}

// Modal unificado de pesquisa, aberto a partir da lupa do cabeçalho (e dos
// outros pontos de entrada da "pesquisa por foto" - Hero e secção
// "Pesquisa por foto" da homepage). Junta as duas formas de pesquisa que
// antes viviam em sítios separados: texto (que já existia no Hero) e foto
// (que antes só estava disponível como botão a meio da página /catalogo).
export default function SearchModal() {
  const open = useSearchModalOpen()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [imageResults, setImageResults] = useState<ImageSearchResult[] | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  if (!open) return null

  function resetState() {
    setQuery('')
    setImageLoading(false)
    setImageResults(null)
    setImageError(null)
  }

  function handleClose() {
    closeSearchModal()
    resetState()
  }

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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-24"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Pesquisar</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleTextSubmit}
          className="flex items-center gap-2 bg-gray-50 rounded-full p-1.5 pl-4 mb-4"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisa por modelo ou marca..."
            autoFocus
            className="flex-1 min-w-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
          />
          <button
            type="submit"
            aria-label="Pesquisar"
            className="w-9 h-9 rounded-full bg-orange-600 hover:bg-orange-700 transition-colors flex items-center justify-center text-white shrink-0"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
        </form>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">ou</span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-orange-600 hover:border-orange-300 transition-colors disabled:opacity-50"
        >
          {imageLoading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <circle cx="12" cy="13" r="3" />
            </svg>
          )}
          {imageLoading ? 'A analisar...' : 'Carregar ou tirar uma fotografia'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelected}
          className="hidden"
        />

        {imageError && <p className="mt-3 text-sm text-red-600 text-center">{imageError}</p>}

        {imageResults && (
          <div className="mt-4">
            {imageResults.length === 0 ? (
              <p className="text-sm text-gray-400 text-center">Não encontrámos nenhum modelo parecido.</p>
            ) : (
              <div className="space-y-2">
                {imageResults.map((r) => (
                  <Link
                    key={r.id}
                    href={`/produto/${r.slug}`}
                    onClick={handleClose}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 hover:border-orange-300 transition-colors"
                  >
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-50 overflow-hidden">
                      {r.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image_url} alt={r.model_name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{r.brand_name}</p>
                      <p className="font-semibold text-gray-900 truncate">{r.model_name}</p>
                      <p className="text-xs text-gray-400">{Math.round(r.similarity * 100)}% parecido</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
