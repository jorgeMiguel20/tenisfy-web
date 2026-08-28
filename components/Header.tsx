// components/Header.tsx
import Link from 'next/link'
import CompareNavLink from './CompareNavLink'
import FavoritesNavLink from './FavoritesNavLink'
import type { GenderGroupValue } from '@/lib/genderGroups'

const NAV_LINKS: { label: string; value: GenderGroupValue }[] = [
  { label: 'Homem', value: 'homem' },
  { label: 'Mulher', value: 'mulher' },
  { label: 'Crianças', value: 'crianca' },
]

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="h-[3px] bg-orange-600" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 flex items-center gap-1.5 sm:gap-8">
        {/* Link nativo (não o <Link> do Next.js) para garantir sempre
            uma recarga completa - reset total da pesquisa, filtros e
            género selecionado, mesmo se já estivermos na homepage. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="font-display text-xl sm:text-2xl font-bold tracking-tight text-gray-900 shrink-0">
          Parjusto
        </a>

        <nav className="flex items-center gap-1.5 sm:gap-6">
          {/* Marcas e Promoções apontam para secções da própria homepage
              (catálogo com filtro de marca, e os destaques de "Maior
              poupança agora") - a app ainda não tem páginas dedicadas para
              cada uma, por isso ficam escondidas no mobile para não
              sobrecarregar a barra já ocupada com Homem/Mulher/Crianças. */}
          <Link
            href="/#catalogo"
            className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors whitespace-nowrap"
          >
            Marcas
          </Link>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={`/?genero=${link.value}`}
              className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/#promocoes"
            className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors whitespace-nowrap"
          >
            Promoções
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-6">
          <Link
            href="/"
            aria-label="Pesquisar"
            className="hidden sm:flex text-gray-600 hover:text-orange-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
            </svg>
          </Link>
          <CompareNavLink />
          <FavoritesNavLink />
        </div>
      </div>
    </header>
  )
}
