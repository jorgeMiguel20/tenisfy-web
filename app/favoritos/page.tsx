// app/favoritos/page.tsx
import type { Metadata } from 'next'
import FavoritesGrid from '@/components/FavoritesGrid'

export const metadata: Metadata = {
  title: 'Os meus favoritos | Tenisfy',
  description: 'Os produtos que guardaste como favoritos neste dispositivo.',
}

export default function FavoritosPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Os meus favoritos</h1>
      <FavoritesGrid />
    </main>
  )
}
