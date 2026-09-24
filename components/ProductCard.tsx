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
  // true no catálogo (grelha sem espaços): cada cartão só desenha as linhas
  // da direita e de baixo e a grelha desenha as de cima e da esquerda, para
  // as linhas de 1px nunca ficarem duplicadas. Fora da grelha (ex.:
  // "Modelos semelhantes", favoritos) o cartão tem contorno completo.
  inGrid?: boolean
}

export default function ProductCard({ product, isSelected = false, onToggleCompare, inGrid = false }: ProductCardProps) {
  const lowestPrice = product.lowest_price
  const storeCount = product.store_count ?? 0
  const discount = product.priceDrop ?? product.savings
  const dropPercent =
    discount && lowestPrice
      ? Math.round((discount.amount / (lowestPrice + discount.amount)) * 100)
      : null
  // Regra pedida pelo Jorge: só mostrar o selo "-X%" a partir de 5% de
  // desconto - descidas de 1 a 4% são normais da flutuação de preço do dia
  // a dia e não comunicam uma poupança real, por isso deixavam o selo com
  // pouco valor (ex.: "-1%"). MIN_DISCOUNT_PERCENT_TO_SHOW fica à parte
  // para ser fácil de ajustar mais tarde. Mesma regra aplicada em
  // components/CompararPreview.tsx (mesma fórmula e selo).
  const MIN_DISCOUNT_PERCENT_TO_SHOW = 5
  const showDropBadge = dropPercent != null && dropPercent >= MIN_DISCOUNT_PERCENT_TO_SHOW

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
      className={`group relative flex h-full flex-col overflow-hidden bg-white ${
        inGrid ? 'border-r border-b' : 'border'
      } border-[#17232B]/10`}
    >
      {/* aspect-[16/10] (era aspect-[4/5]) - mesma correcao aplicada em
          MaiorPoupancaAgora.tsx: as fotos sao um quadrado com o tenis so a
          ocupar a faixa central, por isso uma caixa vertical deixava muito
          espaco vazio a volta. Uma caixa mais larga do que alta faz o
          object-cover cortar esse espaco vazio em cima/baixo em vez dos
          lados, e o tenis fica maior. */}
      <div
        className="relative aspect-[16/10] bg-gray-50 overflow-hidden"
        onTouchStart={photos.length > 1 ? handleTouchStart : undefined}
        onTouchEnd={photos.length > 1 ? handleTouchEnd : undefined}
      >
        {/* Faixa superior: desconto à esquerda, alerta + favorito lado a lado
            à direita - ambos à mesma altura (antes o desconto ficava mais
            abaixo, colado ao topo da imagem, em vez de alinhado com estes
            ícones). */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
          {showDropBadge ? (
            // Cor pedida pelo Jorge: o mesmo verde vivo usado no rótulo
            // "Como funciona" (components/ComoFunciona.tsx, emerald-300),
            // em vez do verde escuro anterior (#1F5F58). Como é um verde
            // claro, o texto branco de antes ficava sem contraste - por
            // isso o texto passa a emerald-950 (verde muito escuro da
            // mesma família), mantendo exatamente o tom de verde pedido.
            <span className="rounded-none bg-[#123F3A] px-2 py-1 text-[11px] font-semibold tabular-nums text-white">
              -{dropPercent}%
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {lowestPrice != null && (
                <PriceAlertButton
                  productId={product.id}
                  currentPrice={lowestPrice}
                  imageUrl={product.image_url}
                  brandName={product.brands?.name}
                  modelName={product.model_name}
                />
              )}
            <FavoriteButton slug={product.slug} />
          </div>
        </div>

        {photos.map((src, index) => (
          <div
            key={src}
            aria-hidden={index === photoIndex ? undefined : true}
            className={`absolute inset-0 transition-opacity duration-300 ${
              index === photoIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Fundo desfocado com a propria foto - so nas fotos extra (index > 0),
                que sao as fotos originais tal como vieram, com fundos diferentes
                entre si. A foto principal (index 0) ja vem com o fundo do cartao
                normalizado, por isso fica exatamente como estava, sem este fundo. */}
            {index > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-60"
              />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={index === photoIndex ? product.model_name : ''}
              loading={index === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}

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
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]">
          {product.brands?.name}
        </p>
        <h3 className="mt-1 mb-2 line-clamp-2 min-h-[2.5rem] text-[15px] font-medium leading-snug text-[#17232B]">{product.model_name}</h3>
        {lowestPrice ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums text-[#17232B]">
                {formatPrice(lowestPrice)}
              </span>
              {storeCount > 0 && (
                <span className="text-xs text-[#5C6770]">
                  · {storeCount} {storeCount === 1 ? 'loja' : 'lojas'}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#5C6770]">Sem oferta disponível</p>
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
            className={`mt-auto pt-3 inline-flex w-fit self-center items-center gap-1.5 rounded-none px-3 py-2 text-xs transition-colors ${
              isSelected
                ? 'font-semibold bg-[#E8F2EF] text-[#123F3A] border border-[#123F3A]/30'
                : 'font-semibold bg-white text-[#17232B] border border-[#17232B]/30 hover:border-[#17232B]'
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
