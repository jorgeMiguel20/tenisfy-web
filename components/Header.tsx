// components/Header.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import CompareNavLink from './CompareNavLink'
import FavoritesNavLink from './FavoritesNavLink'
import HeaderSearchButton from './HeaderSearchButton'
import HeaderSearchBar from './HeaderSearchBar'
import { useSearchModalOpen } from '@/lib/searchModal'
import type { GenderGroupValue } from '@/lib/genderGroups'

const NAV_LINKS: { label: string; value: GenderGroupValue }[] = [
  { label: 'Homem', value: 'homem' },
  { label: 'Mulher', value: 'mulher' },
  { label: 'Crianças', value: 'crianca' },
]

export default function Header() {
  // Ao clicar na lupa (ou no ícone de câmara do Hero / botão "Experimenta a
  // Pesquisa por Foto"), o menu dá lugar a uma barra de pesquisa encaixada
  // no próprio cabeçalho - ver components/HeaderSearchBar.tsx - em vez de
  // abrir um modal ou painel flutuante por cima da página.
  const searchOpen = useSearchModalOpen()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="h-[3px] bg-orange-600" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 flex items-center gap-1.5 sm:gap-8">
        {/* Link nativo (não o <Link> do Next.js) para garantir sempre
            uma recarga completa - reset total da pesquisa, filtros e
            género selecionado, mesmo se já estivermos na homepage. */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Abrir menu"
          aria-expanded={mobileMenuOpen}
          className="sm:hidden inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="font-display text-xl sm:text-2xl font-bold tracking-tight text-gray-900 shrink-0">
          Parjusto
        </a>

        {searchOpen ? (
          <>
            <HeaderSearchBar />
            {/* Em ecrãs pequenos ficam escondidos para dar espaço à barra
                (mesmo padrão do "Marcas"/"Promoções" acima); em tablet/
                desktop sobra espaço de sobra e mantê-los visíveis evita o
                vazio à direita da barra. */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-6 shrink-0">
              <CompareNavLink />
              <FavoritesNavLink />
            </div>
          </>
        ) : (
          <>
            <nav className="flex items-center gap-1.5 sm:gap-6">
              {/* Marcas leva à página de catálogo (onde está o filtro de marca);
                  Promoções continua a apontar para a secção "Maior poupança
                  agora" da própria homepage - a app ainda não tem uma página
                  dedicada a promoções. Ambos ficam escondidos no mobile para não
                  sobrecarregar a barra já ocupada com Homem/Mulher/Crianças. */}
              {/* prefetch=false nestes links: /catalogo é uma Server Component
                  que não lê ?genero=/?q= no próprio servidor (quem lê é o
                  ProductGrid, no cliente, via useSearchParams) - por isso o
                  Next.js estava a pré-carregar o mesmo payload do servidor
                  várias vezes (uma por cada link "Marcas"/Homem/Mulher/
                  Crianças), gastando dados à toa em ligações móveis mais
                  fracas sem qualquer ganho de velocidade real. */}
              <Link
                href="/catalogo"
                prefetch={false}
                className="hidden sm:inline-flex items-center min-h-[44px] text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors whitespace-nowrap"
              >
                Marcas
              </Link>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={`/catalogo?genero=${link.value}`}
                  prefetch={false}
                  className="inline-flex items-center min-h-[44px] text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
              <Link
                href="/#promocoes"
                className="hidden sm:inline-flex items-center min-h-[44px] text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors whitespace-nowrap"
              >
                Promoções
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-2 sm:gap-6">
              <HeaderSearchButton />
              <CompareNavLink />
              <FavoritesNavLink />
            </div>
          </>
        )}
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-2">
          <nav className="flex flex-col">
            <Link
              href="/catalogo"
              prefetch={false}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
            >
              Marcas
            </Link>
            <Link
              href="/#promocoes"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
            >
              Promoções
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
