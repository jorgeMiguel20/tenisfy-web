// components/MaiorPoupancaAgora.tsx
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import { formatDay } from '@/lib/formatDay'
import type { ProductWithPrice } from '@/lib/types'
import PromoCard from './PromoCard'

// Grelha de até 4 produtos reais com a maior descida de preço nos últimos
// 14 dias (ver lib/priceDrop.ts), sempre pares de adulto (ver app/page.tsx) -
// nunca percentagens ou produtos inventados, sempre a partir de
// product_offers/price_history reais. Sem descidas = a secção não aparece
// (a página /promocoes explica isso a quem lá chega pelo menu).
//
// Estilo alinhado com o resto da homepage: rótulo de 11px, título 32/44px,
// cartões iguais aos da página /promocoes (components/PromoCard.tsx).
const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'

export default function MaiorPoupancaAgora({ products }: { products: ProductWithPrice[] }) {
  if (products.length === 0) return null

  return (
    <section className="py-16 sm:px-6 sm:py-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={LABEL}>Desceu nos últimos 14 dias</p>
          <h2 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B] sm:text-[44px]">
            Maior poupança agora
          </h2>
        </div>
        <Link
          href="/promocoes"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-[#17232B] underline decoration-[#17232B]/30 underline-offset-4 transition-colors hover:decoration-[#17232B]"
        >
          Ver todas as promoções
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          const drop = product.priceDrop!
          const currentPrice = product.lowest_price!
          const previousPrice = Math.round((currentPrice + drop.amount) * 100) / 100
          return (
            <PromoCard
              key={product.id}
              slug={product.slug}
              imageUrl={product.image_url}
              brandName={product.brands?.name}
              modelName={product.model_name}
              price={currentPrice}
              referencePrice={previousPrice}
              note={`Desceu ${formatPrice(drop.amount)} desde ${formatDay(drop.sinceDate)}`}
            />
          )
        })}
      </div>
    </section>
  )
}
