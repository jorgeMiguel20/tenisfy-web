// components/Header.tsx
import Link from 'next/link'
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-8">
        {/* Link nativo (não o <Link> do Next.js) para garantir sempre
            uma recarga completa - reset total da pesquisa, filtros e
            género selecionado, mesmo se já estivermos na homepage. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 shrink-0">
          Parjusto
        </a>

        <nav className="flex items-center gap-2.5 sm:gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={`/?genero=${link.value}`}
              className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <FavoritesNavLink />
      </div>
    </header>
  )
}
