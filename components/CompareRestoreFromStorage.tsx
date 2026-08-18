// components/CompareRestoreFromStorage.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCompare } from '@/lib/compare'

// Só é montado quando /comparar é visitado sem ?produtos= (link do
// cabeçalho antes de hidratar, recarregar a página, ou aceder ao URL
// diretamente). O localStorage (lib/compare.ts) é a fonte da verdade da
// seleção partilhada - se já houver produtos guardados, substitui o URL
// para os refletir, o que faz a página (Server Component) voltar a
// carregar já com os produtos certos. Sem isto, a página fica sempre vazia
// mesmo com uma seleção válida guardada.
export default function CompareRestoreFromStorage() {
  const router = useRouter()
  const { compareSlugs } = useCompare()

  useEffect(() => {
    if (compareSlugs.length > 0) {
      router.replace(`/comparar?produtos=${compareSlugs.join(',')}`, { scroll: false })
    }
  }, [compareSlugs, router])

  return null
}
