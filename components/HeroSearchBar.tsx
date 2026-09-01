// components/HeroSearchBar.tsx
'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import HeroPhotoSearchButton from './HeroPhotoSearchButton'
import { useSearchModalOpen } from '@/lib/searchModal'
import { getImageEmbedding } from '@/lib/imageEmbedding'

// Chips de sugestão: apontam para /catalogo?q=..., que o ProductGrid já lê
// como pesquisa inicial (ver o parâmetro "q" sincronizado em ProductGrid.tsx).
const SUGGESTIONS = ['Air Force 1', 'Samba', 'New Balance 550']

type ImageSearchResult = {
  id: string
  slug: string
  model_name: string
  image_url: string | null
  brand_name: string
  similarity: number
}

// A barra de pesquisa "completa" (com sugestões) vive só aqui no Hero -
// ver components/HeaderSearchBar.tsx para a versão compacta do cabeçalho.
// Quando a pesquisa do cabeçalho está aberta (lupa clicada), esta barra
// esconde-se para nunca haver duas pesquisas visíveis ao mesmo tempo na
// página.
//
// A pesquisa por foto (ícone de câmara) é tratada aqui mesmo, com o seu
// próprio file input: ao contrário da versão antiga, que delegava para o
// estado partilhado do cabeçalho e obrigava a um segundo toque para o
// seletor nativo abrir de facto, aqui o toque no ícone abre logo a
// câmara/galeria e o resultado aparece já num dropdown por baixo desta
// barra (mesmo padrão visual do HeaderSearchBar).
export default function HeroSearchBar() {
  const headerSearchOpen = useSearchModalOpen()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [imageLoading, setImageLoading] = useState(false)
  const [imageResults, setImageResults] = useState<ImageSearchResult[] | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  if (headerSearchOpen) return null

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
    <>
      {/* Pesquisa real: formulário GET simples, sem precisar de JS — a
          página /catalogo já lê ?q= (ver ProductGrid.tsx) e aplica-o à
          grelha. O input de foto abaixo não tem "name", por isso nunca
          entra na query string deste GET. */}
      <form
        action="/catalogo"
        method="get"
        className="relative mt-6 flex items-center gap-2 bg-white rounded-full p-1.5 pl-5 shadow-lg max-w-md"
      >
        <input
          type="text"
          name="q"
          placeholder="Pesquisa por modelo, marca ou foto..."
          className="flex-1 min-w-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
        />
        <HeroPhotoSearchButton onClick={() => fileInputRef.current?.click()} loading={imageLoading} />
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelected}
          className="hidden"
        />

        {showDropdown && (
          <div className="absolute left-0 top-full mt-2 w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 p-4 z-50">
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
      </form>

      <div className="mt-3 flex flex-wrap gap-2 max-w-md">
        {SUGGESTIONS.map((term) => (
          <Link
            key={term}
            href={`/catalogo?q=${encodeURIComponent(term)}`}
            className="text-xs font-semibold bg-white/90 hover:bg-white text-gray-700 rounded-full px-3 py-1.5 transition-colors"
          >
            {term}
          </Link>
        ))}
      </div>
    </>
  )
}
