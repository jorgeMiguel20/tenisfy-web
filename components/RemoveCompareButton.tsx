// components/RemoveCompareButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCompare } from '@/lib/compare'

export default function RemoveCompareButton({
  remainingSlugs,
  label,
}: {
  remainingSlugs: string[]
  label: string
}) {
  const router = useRouter()
  const { setCompare } = useCompare()

  function handleClick() {
    setCompare(remainingSlugs)
    const href = remainingSlugs.length > 0 ? `/comparar?produtos=${remainingSlugs.join(',')}` : '/comparar'
    router.push(href, { scroll: false })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Remover ${label} da comparação`}
      className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-sm hover:border-gray-300 hover:text-gray-700 transition-colors"
    >
      <span aria-hidden="true">&times;</span>
    </button>
  )
}
