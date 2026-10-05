// components/CatalogoBackBar.tsx
import Link from 'next/link'

// Percurso no topo do catálogo, igual ao das outras páginas
// ("Parjusto / Promoções", "Parjusto / Marcas / Nike"...).
export default function CatalogoBackBar() {
  return (
    <nav className="mb-6 text-[13px] text-[#5C6770]">
      <Link href="/" className="transition-colors hover:text-[#17232B]">
        Parjusto
      </Link>
      <span className="mx-1.5">/</span>
      <span className="text-[#17232B]">Catálogo</span>
    </nav>
  )
}
