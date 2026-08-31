// components/CompareNavLink.tsx
'use client'

import Link from 'next/link'
import { useCompare } from '@/lib/compare'

export default function CompareNavLink() {
  const { compareSlugs } = useCompare()
  const count = compareSlugs.length
  const href = count > 0 ? `/comparar?produtos=${compareSlugs.join(',')}` : '/comparar'

  return (
    <Link
      href={href}
      aria-label="Comparar"
      className="flex shrink-0 items-center justify-center gap-1.5 min-h-[44px] px-1 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
    >
      {/* Mobile: só o ícone (mesmas setas opostas do botão "Comparar" dos
          cards, para a linguagem visual ser igual). A partir de sm, mostra
          o texto normalmente, tal como o link "Favoritos" ao lado. */}
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 sm:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 7h11m0 0l-3-3m3 3l-3 3M17 17H6m0 0l3 3m-3-3l3-3"
        />
      </svg>
      <span className="hidden sm:inline">Comparar</span>
      {count > 0 && (
        <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-orange-600 text-white text-[11px] font-semibold">
          {count}
        </span>
      )}
    </Link>
  )
}
