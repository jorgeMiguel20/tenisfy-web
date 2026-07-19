// components/Header.tsx
import Link from 'next/link'

export default function Header() {
  return (
    <header className="border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-gray-900">
          Tenisfy
        </Link>
      </div>
    </header>
  )
}