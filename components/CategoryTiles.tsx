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
          className="group relative block aspect-[3/4] overflow-hidden rounded-2xl"
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
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent"
          />
          <span className="font-display absolute bottom-4 left-4 text-base font-bold text-white">
            {category.label}
          </span>
        </Link>
      ))}
    </section>
  )
}
