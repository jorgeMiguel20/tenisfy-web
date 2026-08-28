// components/CatalogoBackBar.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

// "Voltar" regressa ao histórico do browser (ex.: se o utilizador chegou
// aqui a partir de um filtro por género no cabeçalho); "Página Inicial"
// leva sempre à homepage, independentemente de como se chegou ao catálogo.
export default function CatalogoBackBar() {
  const router = useRouter()

  return (
    <div className="flex items-center gap-3 text-sm font-medium text-gray-500 mb-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 hover:text-orange-600 transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Voltar
      </button>
      <span className="text-gray-300">|</span>
      <Link href="/" className="hover:text-orange-600 transition-colors">
        Página Inicial
      </Link>
    </div>
  )
}
