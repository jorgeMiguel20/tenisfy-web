// components/RemoveCompareButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCompare } from '@/lib/compare'

// Remove um ténis da comparação.
// - variant "icon" (desktop): círculo com × por cima da foto, com linha de
//   1px e sem sombra (regra visual: nada de sombras).
// - variant "text" (telemóvel): botão de texto "Remover" por baixo da foto
//   - no telemóvel as fotos são pequenas e o círculo tapava o ténis.
export default function RemoveCompareButton({
  remainingSlugs,
  label,
  variant = 'icon',
}: {
  remainingSlugs: string[]
  label: string
  variant?: 'icon' | 'text'
}) {
  const router = useRouter()
  const { setCompare } = useCompare()

  function handleClick() {
    setCompare(remainingSlugs)
    const href = remainingSlugs.length > 0 ? `/comparar?produtos=${remainingSlugs.join(',')}` : '/comparar'
    router.push(href, { scroll: false })
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Remover ${label} da comparação`}
        className="mt-1 inline-flex min-h-[36px] items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770] transition-colors hover:text-[#17232B]"
      >
        <span aria-hidden="true" className="text-sm leading-none">
          &times;
        </span>
        Remover
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Remover ${label} da comparação`}
      className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#17232B]/10 bg-white text-[#5C6770] transition-colors hover:border-[#17232B]/40 hover:text-[#17232B]"
    >
      <span aria-hidden="true">&times;</span>
    </button>
  )
}
