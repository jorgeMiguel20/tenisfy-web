// components/ProductCard.tsx
'use client'

import { useRef, useState, type MouseEvent, type TouchEvent } from 'react'
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

  // Fotos do mini-carrossel do card (estilo Lacoste/Armani): a foto de capa
  // primeiro, depois as restantes fotos do produto, sem repetir. Só aparecem
  // pontinhos quando há mais de uma - no mobile dá para arrastar (swipe)
  // entre elas sem sair da grelha; no desktop mostra sempre a capa (o hover
  // já dá destaque ao card, sem precisar de gesto de swipe).
  const photos = [product.image_url, ...(product.image_urls ?? [])].filter(
    (url, index, all): url is string => !!url && all.indexOf(url) === index
  )
  const [photoIndex, setPhotoIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  function selectPhoto(index: number, e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setPhotoIndex(index)
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX.current == null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(deltaX) < 30) return
    setPhotoIndex((current) =>
      deltaX < 0 ? Math.min(current + 1, photos.length - 1) : Math.max(current - 1, 0)
    )
  }

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group relative flex h-full flex-col overflow-hidden bg-white border-r border-b border-black transition-shadow hover:shadow-lg"
    >
      <div
        className="relative aspect-[4/5] bg-gray-50 overflow-hidden"
        onTouchStart={photos.length > 1 ? handleTouchStart : undefined}
        onTouchEnd={photos.length > 1 ? handleTouchEnd : undefined}
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

        {photos[photoIndex] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[photoIndex]}
            alt={product.model_name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        )}

        {/* Pontinhos (estilo Armani): só no mobile e só quando há mais de
            uma foto. */}
        {photos.length > 1 && (
          // Pontinhos finos, estilo Armani/referência (pedido do Jorge): sem
          // fundo/pílula à volta e todos redondos do mesmo tamanho - só a
          // cor muda entre ativo e inativo, em vez do pontinho ativo esticar
          // para uma barra.
          <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1 sm:hidden">
            {photos.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => selectPhoto(index, e)}
                aria-label={`Ver foto ${index + 1} de ${photos.length}`}
                aria-current={index === photoIndex}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  index === photoIndex ? 'bg-gray-900' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {product.brands?.name}
        </p>
        <h3 className="font-semibold text-gray-900 mt-0.5 mb-2 line-clamp-2 min-h-[2.5rem]">{product.model_name}</h3>
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
            className={`mt-auto pt-3 inline-flex w-fit self-center items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
              isSelected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
      </div>
    </Link>
  )
}
