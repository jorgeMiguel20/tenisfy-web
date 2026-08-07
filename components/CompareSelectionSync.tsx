// components/CompareSelectionSync.tsx
'use client'

import { useEffect } from 'react'
import { useCompare } from '@/lib/compare'

// A pagina /comparar é sempre a fonte visual da verdade (guiada pelo URL
// ?produtos=), mas o cabeçalho lê a seleção partilhada em lib/compare.ts.
// Este componente garante que, seja qual for o caminho usado para lá chegar
// (link partilhado, favoritos, o seletor "+", o botão × de remover), a
// seleção partilhada fica sempre igual ao que a página mostra.
export default function CompareSelectionSync({ slugs }: { slugs: string[] }) {
  const { setCompare } = useCompare()

  useEffect(() => {
    setCompare(slugs)
  }, [slugs, setCompare])

  return null
}
