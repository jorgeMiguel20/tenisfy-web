// components/PromoCard.tsx
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'

// Cartão de promoção (página /promocoes e "Maior poupança agora" da
// homepage): foto, selo -X%, marca, modelo, preço atual, preço de
// referência riscado e uma linha a explicar de onde vem a poupança - para a
// pessoa perceber sempre com o quê está a ser comparado (preço oficial da
// marca ou preço de há uns dias). Todos os valores vêm de dados reais.
const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'

export default function PromoCard({
  slug,
  imageUrl,
  brandName,
  modelName,
  price,
  referencePrice,
  note,
}: {
  slug: string
  imageUrl: string | null
  brandName: string | null | undefined
  modelName: string
  price: number
  referencePrice: number
  note: string
}) {
  const percentOff = Math.round(((referencePrice - price) / referencePrice) * 100)
  return (
    <Link
      href={`/produto/${slug}`}
      className="group block h-full overflow-hidden rounded-none border border-[#17232B]/10 bg-white"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#F9FBFC]">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${brandName ?? ''} ${modelName}`.trim()}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {percentOff >= 1 && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-none bg-[#15803D] px-2 py-1 text-[11px] font-bold tabular-nums text-white">
            -{percentOff}%
          </span>
        )}
      </div>
      <div className="border-t border-[#17232B]/10 p-4">
        <p className={LABEL}>{brandName}</p>
        <h3 className="mt-1 text-[15px] font-medium text-[#17232B]">{modelName}</h3>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums text-[#17232B]">{formatPrice(price)}</span>
          <span className="text-sm tabular-nums text-[#5C6770] line-through">{formatPrice(referencePrice)}</span>
        </p>
        <p className="mt-1 text-[13px] leading-snug text-[#5C6770]">{note}</p>
      </div>
    </Link>
  )
}
