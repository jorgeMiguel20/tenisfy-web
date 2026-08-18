// components/HighlightProductCard.tsx
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import type { SavingsResult } from '@/lib/savings'
import type { PriceDropResult } from '@/lib/priceDrop'

export type HighlightOffer = {
  store: string
  price: number
  freshness: string | null
  url: string
}

type HighlightProductCardProps = {
  product: {
    slug: string
    brand: string
    name: string
    image: string | null
  }
  savings: SavingsResult
  priceDrop: PriceDropResult
  offers: HighlightOffer[]
  shortcuts: { slug: string; label: string }[]
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 5h5v5" />
      <path d="M19 5l-8 8" />
      <path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
    </svg>
  )
}

export default function HighlightProductCard({ product, savings, priceDrop, offers, shortcuts }: HighlightProductCardProps) {
  if (offers.length === 0) return null

  const bestOffer = offers[0]

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-8">
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 sm:gap-8 items-start">
        <div>
          <Link href={`/produto/${product.slug}`} className="block aspect-square rounded-xl bg-gray-50 overflow-hidden">
            {product.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            )}
          </Link>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{product.brand}</p>
            <Link href={`/produto/${product.slug}`} className="block font-semibold text-lg text-gray-900 mt-0.5 hover:underline">
              {product.name}
            </Link>
            {priceDrop && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full mt-2">
                ↓ {formatPrice(priceDrop.amount)} em 7 dias
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-4 flex-wrap pb-5 border-b border-gray-100">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {offers.length} {offers.length === 1 ? 'loja' : 'lojas'}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold text-orange-600">{formatPrice(bestOffer.price)}</span>
                <span className="text-sm text-gray-500">melhor preço</span>
              </div>
              {savings && (
                <span className="inline-flex items-center bg-orange-50 text-orange-700 text-sm font-medium px-3 py-1 rounded-full mt-2">
                  Poupa {formatPrice(savings.amount)} escolhendo {savings.store}
                </span>
              )}
            </div>
            <a
              href={bestOffer.url}
              target="_blank"
              rel="nofollow sponsored noopener"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-full text-sm font-semibold hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              Ir à {bestOffer.store}
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          </div>

          {/* Desktop/tablet: tabela (a partir de sm) */}
          <div className="hidden sm:block">
            {offers.map((offer, index) => (
              <a
                key={offer.store}
                href={offer.url}
                target="_blank"
                rel="nofollow sponsored noopener"
                className={`flex items-center gap-4 py-3.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors ${index !== 0 ? 'border-t border-gray-50' : ''}`}
              >
                <span
                  className={`w-1.5 h-6 rounded-sm shrink-0 ${index === 0 ? 'bg-orange-600' : 'bg-gray-200'}`}
                  aria-hidden="true"
                />
                <span className="flex-1 flex items-center gap-2 min-w-0">
                  <span className={`text-sm ${index === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{offer.store}</span>
                  {index === 0 && offers.length > 1 && (
                    <span className="inline-flex items-center bg-green-50 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                      Melhor preço
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-500 w-20 shrink-0 text-right">{offer.freshness ?? ''}</span>
                <span className="text-sm font-medium text-gray-900 w-20 shrink-0 text-right">{formatPrice(offer.price)}</span>
                <ExternalLinkIcon className="h-4 w-4 text-gray-300 shrink-0" />
              </a>
            ))}
          </div>

          {/* Mobile: cards empilhados, sem scroll horizontal (abaixo de sm) */}
          <div className="flex flex-col gap-2 sm:hidden mt-1">
            {offers.map((offer, index) => (
              <a
                key={offer.store}
                href={offer.url}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="flex items-center gap-3 rounded-xl border border-gray-100 p-3"
              >
                <span
                  className={`w-1.5 h-8 rounded-sm shrink-0 ${index === 0 ? 'bg-orange-600' : 'bg-gray-200'}`}
                  aria-hidden="true"
                />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm ${index === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{offer.store}</span>
                    {index === 0 && offers.length > 1 && (
                      <span className="inline-flex items-center bg-green-50 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                        Melhor preço
                      </span>
                    )}
                  </span>
                  {offer.freshness && <span className="block text-xs text-gray-400 mt-0.5">{offer.freshness}</span>}
                </span>
                <span className="text-sm font-medium text-gray-900 shrink-0">{formatPrice(offer.price)}</span>
                <ExternalLinkIcon className="h-4 w-4 text-gray-300 shrink-0" />
              </a>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Preços com portes incluídos quando aplicável. Sem selo de verificação quando a última leitura tem mais de 48h.
          </p>
        </div>
      </div>

      {shortcuts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-gray-100">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400 mr-1">Ir direto a</span>
          {shortcuts.map((s) => (
            <Link
              key={s.slug}
              href={`/produto/${s.slug}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:bg-gray-100 transition-colors"
            >
              {s.label}
              <svg className="h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
