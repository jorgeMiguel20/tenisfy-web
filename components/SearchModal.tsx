// components/SearchModal.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { closeSearchModal, consumePendingImageFile, usePendingImageFile, useSearchModalOpen } from '@/lib/searchModal'
import { getImageEmbedding } from '@/lib/imageEmbedding'

type ImageSearchResult = {
  id: string
  slug: string
  model_name: string
  image_url: string | null
  brand_name: string
  similarity: number
}

// Mesmos termos de sugestão do Hero (components/HomeHero.tsx) - repetidos
// aqui como atalhos rápidos dentro do painel, em vez de duplicar a lógica
// de pesquisa.
const SUGGESTIONS = ['Air Force 1', 'Samba', 'New Balance 550']

// Painel flutuante de pesquisa (estilo command palette), aberto a partir da
// lupa do cabeçalho e dos outros pontos de entrada da "pesquisa por foto"
// (Hero, secção "Pesquisa por foto" da homepage). Junta texto e foto numa
// única barra, sem parecer uma janela pop-up pesada - ver components/
// HeaderSearchButton.tsx, HeroPhotoSearchButton.tsx e PesquisaPorFotoButton.tsx.
export default function SearchModal() {
  const open = useSearchModalOpen()
  const pendingImageFile = usePendingImageFile()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [imageResults, setImageResults] = useState<ImageSearchResult[] | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  // Fecha com a tecla Esc, como é hábito em paletas de comando/pesquisa rápida.
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeSearchModal()
        setQuery('')
        setImageLoading(false)
        setImageResults(null)
        setImageError(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Abre logo a câmara/galeria quando o modal é aberto a partir do botão
  // "Experimenta a Pesquisa por Foto" (ver PesquisaPorFotoButton.tsx), em
  // vez de mostrar primeiro a barra de texto.
  useEffect(() => {
    if (open && pendingImageFile) {
      processImageFile(pendingImageFile)
      consumePendingImageFile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingImageFile])

  if (!open) return null

  function handleClose() {
    closeSearchModal()
    setQuery('')
    setImageLoading(false)
    setImageResults(null)
    setImageError(null)
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    handleClose()
    router.push(trimmed ? `/catalogo?q=${encodeURIComponent(trimmed)}` : '/catalogo')
  }

  function handleSuggestionClick(term: string) {
    handleClose()
    router.push(`/catalogo?q=${encodeURIComponent(term)}`)
  }

  async function processImageFile(file: File) {
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
    }
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await processImageFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 pt-24"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra única: lupa + texto + foto + fechar, sem título nem
            moldura extra à volta - o objetivo é parecer uma pesquisa
            rápida fluida, não uma janela com cabeçalho. */}
        <form onSubmit={handleTextSubmit} className="flex items-center gap-3 px-5 py-4 shrink-0">
          <svg className="h-5 w-5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisa por modelo ou marca..."
            autoFocus
            className="flex-1 min-w-0 text-base text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
          />
          <div className="h-6 w-px bg-gray-200 shrink-0" aria-hidden="true" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageLoading}
            aria-label="Pesquisar por foto"
            className="shrink-0 flex items-center justify-center h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100 hover:text-orange-600 transition-colors disabled:opacity-50"
          >
            {imageLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="shrink-0 flex items-center justify-center h-9 w-9 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
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

        <div className="border-t border-gray-100 px-5 py-4 overflow-y-auto">
          {imageLoading ? (
            <p className="text-sm text-gray-500 text-center py-2">A analisar a fotografia...</p>
          ) : imageError ? (
            <p className="text-sm text-red-600 text-center py-2">{imageError}</p>
          ) : imageResults ? (
            imageResults.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">Não encontrámos nenhum modelo parecido.</p>
            ) : (
              <div className="space-y-1">
                {imageResults.map((r) => (
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
            )
          ) : (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Sugestões</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleSuggestionClick(term)}
                    className="text-sm font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-full px-3 py-1.5 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
