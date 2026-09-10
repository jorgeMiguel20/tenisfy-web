// components/PriceAlertBanner.tsx
import Image from 'next/image'
import PriceAlertButton from './PriceAlertButton'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'

// Pedido do Jorge: tirar "Alertas de preco gratis" da linha pequena no Hero
// (ficava perdida ao lado de "Verificado todos os dias") e dar-lhe uma
// seccao propria, mais convidativa. Usa um produto real (a maior descida de
// preco da semana, ou o showcase do "Como funciona" como recurso) para o
// botao ja abrir o alerta desse par a serio, em vez de ser so decorativo.
export default function PriceAlertBanner({ product }: { product: ProductWithPrice | null }) {
  if (!product || product.lowest_price == null) return null

  const image = product.image_url ?? product.image_urls?.[0] ?? null

  return (
    <section className="mb-12">
      <div className="flex flex-col items-center gap-8 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 sm:flex-row sm:p-10">
        <div className="flex-1">
          <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </span>
          <h2 className="font-display mb-2 text-xl font-bold text-white sm:text-2xl">
            Nunca mais percas uma descida de preço
          </h2>
          <p className="max-w-md text-sm text-white/70">
            Ativa um alerta grátis em qualquer ténis do catálogo e avisamos-te por email assim que o preço descer.
            {product.priceDrop && (
              <>
                {' '}O {product.brands?.name} {product.model_name} já baixou {formatPrice(product.priceDrop.amount)}{' '}
                esta semana — é um bom sítio para começar.
              </>
            )}
          </p>
        </div>

        <div className="flex w-full items-center gap-4 rounded-xl bg-white/5 p-4 sm:w-auto">
          {image && (
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-white">
              <Image src={image} alt={product.model_name} fill sizes="64px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/50">
              {product.brands?.name}
            </p>
            <p className="truncate text-sm font-semibold text-white">{product.model_name}</p>
            <p className="text-sm font-bold text-orange-400">{formatPrice(product.lowest_price)}</p>
          </div>
          <PriceAlertButton productId={product.id} currentPrice={product.lowest_price} variant="large" />
        </div>
      </div>
    </section>
  )
}
