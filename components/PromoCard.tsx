// components/PromoCard.tsx
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'

// Cartão de promoção (página /promocoes e "Maior poupança agora" da
// homepage): foto, selo -X%, marca, modelo, preço atual, preço de
// referência riscado e uma linha a explicar de onde vem a poupança - para a
// pessoa perceber sempre com o quê está a ser comparado (preço oficial da
// marca ou preço de há uns dias). Todos os valores vêm de dados reais.
//
// Três apresentações:
// - 'grid': dentro da grelha da página /promocoes, igual à do catálogo (sem
//   espaços; cada cartão só desenha as linhas da direita e de baixo e a
//   grelha desenha as de cima e da esquerda);
// - 'carousel': cartão mais pequeno, com contorno completo, para o carrossel
//   "Maior poupança agora" da homepage;
// - 'default': o cartão grande de antes.
const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'

export type PromoCardVariant = 'default' | 'grid' | 'carousel'

export default function PromoCard({
  slug,
  imageUrl,
  brandName,
  modelName,
  price,
  referencePrice,
  note,
  variant = 'default',
}: {
  slug: string
  imageUrl: string | null
  brandName: string | null | undefined
  modelName: string
  price: number
  referencePrice: number
  note: string
  variant?: PromoCardVariant
}) {
  const percentOff = Math.round(((referencePrice - price) / referencePrice) * 100)
  const compact = variant !== 'default'
  const border = variant === 'grid' ? 'border-b border-r' : 'border'
  return (
    <Link
      href={`/produto/${slug}`}
      className={`group block h-full overflow-hidden rounded-none ${border} border-[#17232B]/10 bg-white`}
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
          <span
            className={`absolute inline-flex items-center rounded-none bg-[#15803D] font-bold tabular-nums text-white ${
              compact ? 'left-2 top-2 px-1.5 py-0.5 text-[10px]' : 'left-3 top-3 px-2 py-1 text-[11px]'
            }`}
          >
            -{percentOff}%
          </span>
        )}
      </div>
      <div className={`border-t border-[#17232B]/10 ${compact ? 'p-3' : 'p-4'}`}>
        <p className={compact ? 'text-[10px] font-medium uppercase tracking-[0.08em] text-[#5C6770]' : LABEL}>
          {brandName}
        </p>
        <h3 className={`mt-1 font-medium text-[#17232B] ${compact ? 'text-[13px]' : 'text-[15px]'}`}>{modelName}</h3>
        <p className={`flex flex-wrap items-baseline gap-x-2 ${compact ? 'mt-2' : 'mt-3'}`}>
          <span className={`font-bold tabular-nums text-[#17232B] ${compact ? 'text-[15px]' : 'text-xl'}`}>
            {formatPrice(price)}
          </span>
          <span className={`tabular-nums text-[#5C6770] line-through ${compact ? 'text-xs' : 'text-sm'}`}>
            {formatPrice(referencePrice)}
          </span>
        </p>
        <p className={`mt-1 leading-snug text-[#5C6770] ${compact ? 'text-[11px]' : 'text-[13px]'}`}>{note}</p>
      </div>
    </Link>
  )
}
