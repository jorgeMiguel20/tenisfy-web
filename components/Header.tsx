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
        {/* No mobile o hamburger fica à esquerda e o "Parjusto" centrado -
            esta zona (flex-1) equilibra o espaço com a zona espelho da
            lupa/comparar/favorito à direita. No desktop desaparece
            (sm:hidden) e o layout volta ao normal em linha. */}
        <div className={`sm:hidden ${searchOpen ? '' : 'flex-1'}`}>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={mobileMenuOpen}
            className="inline-flex items-center justify-center w-8 h-8 shrink-0 text-gray-700 hover:text-orange-600 transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
        {/* Link nativo (não o <Link> do Next.js) para garantir sempre
            uma recarga completa - reset total da pesquisa, filtros e
            género selecionado, mesmo se já estivermos na homepage. */}
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
            {/* No mobile, Homem/Mulher/Crianças/Marcas/Promoções vivem só
                dentro do menu hamburger (ver painel abaixo) - aqui o nav
                fica escondido e só aparece no desktop. */}
            <nav className="hidden sm:flex items-center gap-6">
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
                className="inline-flex items-center min-h-[44px] text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors whitespace-nowrap"
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
                className="inline-flex items-center min-h-[44px] text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors whitespace-nowrap"
              >
                Promoções
              </Link>
            </nav>

            {/* Lupa + comparar + favorito: sempre visíveis (mobile e
                desktop). No mobile ganham flex-1 para equilibrar o espaço
                com a zona do hamburger à esquerda e assim centrar o
                "Parjusto"; no desktop voltam ao comportamento normal
                (empurrados para a direita com ml-auto). */}
            <div className="flex-1 flex items-center justify-end gap-2 sm:flex-none sm:ml-auto sm:gap-6">
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
            {/* "Ver catálogo" - antes era um botão flutuante sobre a página
                (tapava conteúdo, incl. os ícones de um card vizinho no
                mobile); o Jorge pediu para tirar o botão flutuante e mover a
                mesma ação para aqui dentro do menu hamburger, com o mesmo
                estilo simples dos restantes links (o destaque em pill
                laranja ficava feio, segundo o Jorge). */}
            <Link
              href="/catalogo"
              prefetch={false}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
            >
              Ver catálogo
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={`/catalogo?genero=${link.value}`}
                prefetch={false}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
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
