// components/ProductCard.tsx
import Link from 'next/link'
import type { ProductWithPrice } from '@/lib/types'
import { formatPrice } from '@/lib/formatPrice'
import FavoriteButton from './FavoriteButton'
import PriceAlertButton from './PriceAlertButton'

type ProductCardProps = {
  product: ProductWithPrice
  isSelected?: boolean
  onToggleCompare?: (product: ProductWithPrice) => void
}

export default function ProductCard({ product, isSelected = false, onToggleCompare }: ProductCardProps) {
  const lowestPrice = product.lowest_price
  const storeCount = product.store_count ?? 0
  const discount = product.priceDrop ?? product.savings
  const dropPercent =
    discount && lowestPrice
      ? Math.round((discount.amount / (lowestPrice + discount.amount)) * 100)
      : null

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group relative flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_8px_20px_rgba(17,24,39,0.06)] transition-all hover:border-gray-200 hover:shadow-lg hover:-translate-y-1"
    >
      {/* Faixa superior: desconto à esquerda, alerta + favorito lado a lado
          à direita - ambos à mesma altura (antes o desconto ficava mais
          abaixo, colado ao topo da imagem, em vez de alinhado com estes
          ícones). */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
        {dropPercent != null ? (
          <span className="rounded-md bg-orange-600 px-2 py-1 text-xs font-bold text-white">
            -{dropPercent}%
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {lowestPrice != null && <PriceAlertButton productId={product.id} currentPrice={lowestPrice} />}
          <FavoriteButton slug={product.slug} />
        </div>
      </div>

      <div className="relative aspect-square bg-gray-50 rounded-xl mb-4 overflow-hidden">
        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.model_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {product.brands?.name}
      </p>
      <p className="font-semibold text-gray-900 mt-0.5 mb-2 line-clamp-2 min-h-[2.5rem]">{product.model_name}</p>
      {lowestPrice ? (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-orange-600">
              {formatPrice(lowestPrice)}
            </span>
            {storeCount > 0 && (
              <span className="text-xs text-gray-600">
                · {storeCount} {storeCount === 1 ? 'loja' : 'lojas'}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Sem oferta disponível</p>
      )}

      {/* Botão "Comparar" fica sempre no fundo do card (mt-auto, dentro de
          um card flex-col h-full) para que, numa linha de cards com
          descrições de tamanhos diferentes, os botões e os preços fiquem
          todos alinhados entre si. */}
      {onToggleCompare && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleCompare(product)
          }}
          aria-pressed={isSelected}
          className={`mt-auto pt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
            isSelected
              ? 'bg-gray-900 text-white'
              : 'bg-gray-800 text-white hover:bg-gray-900'
          }`}
        >
          {isSelected ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h11m0 0l-3-3m3 3l-3 3M17 17H6m0 0l3 3m-3-3l3-3" />
            </svg>
          )}
          {isSelected ? 'Selecionado' : 'Comparar'}
        </button>
      )}
    </Link>
  )
}
