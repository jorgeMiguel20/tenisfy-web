// components/Header.tsx
import Link from 'next/link'
import FavoritesNavLink from './FavoritesNavLink'

const NAV_LINKS = [
  { label: 'Homem', genders: ['homem', 'unissexo'] },
  { label: 'Mulher', genders: ['mulher', 'unissexo'] },
  { label: 'Crianças', genders: ['crianca'] },
]

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-8">
        {/* Link nativo (não o <Link> do Next.js) para garantir sempre
            uma recarga completa - reset total da pesquisa, filtros e
            género selecionado, mesmo se já estivermos na homepage. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="text-2xl font-extrabold tracking-tight text-gray-900">
          Tenisfy
        </a>

        <nav className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={`/?genero=${link.genders.join(',')}`}
              className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
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
