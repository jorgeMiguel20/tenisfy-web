// components/CategoryTiles.tsx
import Image from 'next/image'
import Link from 'next/link'
import type { GenderGroupValue } from '@/lib/genderGroups'

const CATEGORIES: { label: string; value: GenderGroupValue; image: string }[] = [
  { label: 'Homem', value: 'homem', image: '/categories/homem.jpg' },
  { label: 'Mulher', value: 'mulher', image: '/categories/mulher.jpg' },
  { label: 'Crianças', value: 'crianca', image: '/categories/crianca.jpg' },
]

// Atalho visual para navegar por género, a complementar os links de texto
// que já existem no cabeçalho/rodapé — mesmas hrefs (/?genero=...), só
// com fotos para tornar a homepage mais convidativa a olho nu.
export default function CategoryTiles() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
      {CATEGORIES.map((category) => (
        <Link
          key={category.value}
          href={`/?genero=${category.value}`}
          className="group relative block aspect-[21/9] sm:aspect-[4/3] overflow-hidden rounded-2xl"
        >
          <Image
            src={category.image}
            alt={category.label}
            fill
            sizes="(min-width: 640px) 33vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/40"
          />
          <span className="font-display absolute inset-0 flex items-center justify-center text-center px-4 text-lg sm:text-xl font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.45)]">
            {category.label}
          </span>
        </Link>
      ))}
    </section>
  )
}
