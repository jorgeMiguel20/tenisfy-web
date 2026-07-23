// components/Header.tsx
import Link from 'next/link'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-gray-900">
          Tenisfy
        </Link>
      </div>
    </header>
  )
}