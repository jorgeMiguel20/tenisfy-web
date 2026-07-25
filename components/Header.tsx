// components/Header.tsx
import Link from 'next/link'

const NAV_LINKS = [
  { label: 'Homens', gender: 'homem' },
  { label: 'Mulheres', gender: 'mulher' },
  { label: 'Crianças', gender: 'crianca' },
]

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-8">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-gray-900">
          Tenisfy
        </Link>

        <nav className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.gender}
              href={`/?genero=${link.gender}`}
              className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
