// components/CompararPreviewCta.tsx
'use client'

import Link from 'next/link'
import { useCompare } from '@/lib/compare'

// Botão "Ir para o comparador" da secção "Vê os ténis lado a lado"
// (CompararPreview.tsx). Antes ia sempre para /comparar "em branco" - um
// visitante novo via os 2 ténis na homepage, clicava e caía numa página
// vazia (confirmado ao vivo). Agora:
// - Sem nenhuma seleção guardada: abre o /comparar já com os 2 ténis que a
//   secção está a mostrar (?produtos=a,b).
// - Com uma seleção já guardada pela pessoa: vai para o /comparar normal,
//   que restaura essa seleção (ver CompareRestoreFromStorage.tsx). Assim
//   nunca apaga uma comparação que a pessoa já tinha montado - abrir
//   /comparar?produtos=... substitui sempre a seleção guardada (ver
//   CompareSelectionSync.tsx).
// No servidor a seleção é sempre vazia (não há localStorage), por isso o
// HTML inicial já traz o link para o par; se a pessoa tiver seleção
// guardada, o link troca logo depois de a página carregar.
export default function CompararPreviewCta({ slugs, className }: { slugs: string[]; className?: string }) {
  const { compareSlugs } = useCompare()
  const href = compareSlugs.length === 0 && slugs.length > 0 ? `/comparar?produtos=${slugs.join(',')}` : '/comparar'

  return (
    <Link href={href} prefetch={false} className={className}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M8 3 4 7l4 4" />
        <path d="M4 7h16" />
        <path d="M16 21l4-4-4-4" />
        <path d="M20 17H4" />
      </svg>
      Ir para o comparador
    </Link>
  )
}
