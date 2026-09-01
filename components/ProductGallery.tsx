// components/ProductGallery.tsx
'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'

type ProductGalleryProps = {
  images: string[]
  alt: string
  // 'thumbnails': barra vertical de miniaturas no desktop em vez de
  // setas/pontos (usado na página de produto). 'default': mantém
  // setas + pontos no desktop (usado no cartão de /comparar).
  layout?: 'default' | 'thumbnails'
  // Setas e pontos mais pequenos, para caber num cartão estreito.
  compact?: boolean
  imageBoxClassName?: string
  sizes?: string
}

export default function ProductGallery({
  images,
  alt,
  layout = 'default',
  compact = false,
  imageBoxClassName = 'h-[55vh] md:h-auto md:aspect-square',
  sizes = '(max-width: 768px) 100vw, 50vw',
}: ProductGalleryProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startX: number; startScrollLeft: number } | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({})

  // Fonte da verdade para navegação intencional (setas/teclado/miniaturas).
  // currentIndex (estado) segue o scroll real e pode ficar temporariamente
  // desatualizado a meio da animação suave; usar esse estado como base para
  // a próxima tecla/clique fazia a navegação rápida repetida desviar-se do
  // alvo. Este ref é atualizado de forma síncrona, sem esse atraso.
  const targetIndexRef = useRef(0)

  const hasMultiple = images.length > 1
  const showThumbnails = layout === 'thumbnails'

  function scrollToIndex(index: number) {
    const scroller = scrollerRef.current
    if (!scroller) return
    const clamped = Math.max(0, Math.min(index, images.length - 1))
    targetIndexRef.current = clamped
    scroller.scrollTo({ left: clamped * scroller.clientWidth, behavior: 'smooth' })
    setCurrentIndex(clamped)
  }

  function handleScroll() {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientWidth === 0) return
    const index = Math.round(scroller.scrollLeft / scroller.clientWidth)
    targetIndexRef.current = index
    setCurrentIndex((prev) => (prev === index ? prev : index))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      scrollToIndex(targetIndexRef.current - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      scrollToIndex(targetIndexRef.current + 1)
    }
  }

  // Arrastar com o rato no desktop (o toque no mobile já é tratado
  // nativamente pelo scroll horizontal do browser, não mexe aqui).
  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse') return
    const scroller = scrollerRef.current
    if (!scroller) return
    dragState.current = { startX: e.clientX, startScrollLeft: scroller.scrollLeft }
    scroller.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse' || !dragState.current) return
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollLeft = dragState.current.startScrollLeft - (e.clientX - dragState.current.startX)
  }

  function endDrag(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse') return
    dragState.current = null
  }

  if (images.length === 0) {
    return (
      <div className={`${imageBoxClassName} bg-gray-50 rounded-2xl overflow-hidden relative`}>
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-gray-300 text-sm">Sem imagem disponível</span>
        </div>
      </div>
    )
  }

  const imageBox = (
    <div
      className={`${imageBoxClassName} bg-gray-50 rounded-2xl overflow-hidden relative select-none ${
        showThumbnails ? 'md:flex-1 md:min-w-0' : ''
      }`}
      role="region"
      aria-label="Galeria de fotos do produto"
      tabIndex={hasMultiple ? 0 : -1}
      onKeyDown={hasMultiple ? handleKeyDown : undefined}
    >
      <div
        ref={scrollerRef}
        onScroll={hasMultiple ? handleScroll : undefined}
        onPointerDown={hasMultiple ? handlePointerDown : undefined}
        onPointerMove={hasMultiple ? handlePointerMove : undefined}
        onPointerUp={hasMultiple ? endDrag : undefined}
        onPointerLeave={hasMultiple ? endDrag : undefined}
        className={`h-full w-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          hasMultiple ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        {images.map((src, index) => (
          <div key={src} className="relative h-full w-full shrink-0 snap-start">
            {!loadedImages[index] && (
              <div className="absolute inset-0 animate-pulse bg-gray-100" />
            )}
            <Image
              src={src}
              alt={`${alt} - foto ${index + 1} de ${images.length}`}
              fill
              sizes={sizes}
              className={`object-contain pointer-events-none transition-opacity duration-300 ${
                loadedImages[index] ? 'opacity-100' : 'opacity-0'
              }`}
              priority={index === 0}
              loading={index === 0 ? undefined : 'lazy'}
              draggable={false}
              onLoad={() => setLoadedImages((prev) => (prev[index] ? prev : { ...prev, [index]: true }))}
            />
          </div>
        ))}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => scrollToIndex(targetIndexRef.current - 1)}
            disabled={currentIndex === 0}
            aria-label="Foto anterior"
            className={`hidden md:flex absolute top-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md hover:bg-white transition-colors disabled:opacity-0 disabled:pointer-events-none ${
              compact ? 'left-2 h-6 w-6' : 'left-3 h-9 w-9'
            }`}
          >
            <svg className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(targetIndexRef.current + 1)}
            disabled={currentIndex === images.length - 1}
            aria-label="Foto seguinte"
            className={`hidden md:flex absolute top-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md hover:bg-white transition-colors disabled:opacity-0 disabled:pointer-events-none ${
              compact ? 'right-2 h-6 w-6' : 'right-3 h-9 w-9'
            }`}
          >
            <svg className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div
            className={`absolute inset-x-0 flex items-center justify-center gap-1.5 ${compact ? 'bottom-2' : 'bottom-3'} ${
              showThumbnails ? 'md:hidden' : ''
            }`}
          >
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => scrollToIndex(index)}
                aria-label={`Ir para a foto ${index + 1} de ${images.length}`}
                aria-current={index === currentIndex}
                className={`rounded-full transition-all ${compact ? 'h-1.5' : 'h-2'} ${
                  index === currentIndex
                    ? `${compact ? 'w-4' : 'w-5'} bg-gray-900`
                    : `${compact ? 'w-1.5' : 'w-2'} bg-white/80 hover:bg-white`
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )

  if (!showThumbnails) return imageBox

  return (
    <div className="md:flex md:items-stretch md:gap-3">
      {hasMultiple && (
        <div className="hidden md:flex md:flex-col md:gap-2 md:w-16 md:shrink-0 md:overflow-y-auto md:max-h-full">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => scrollToIndex(index)}
              aria-label={`Ir para a foto ${index + 1} de ${images.length}`}
              aria-current={index === currentIndex}
              className={`relative aspect-square w-full shrink-0 overflow-hidden rounded-lg border-2 bg-gray-50 transition-colors ${
                index === currentIndex ? 'border-gray-900' : 'border-transparent hover:border-gray-300'
              }`}
            >
              {!loadedImages[index] && (
                <div className="absolute inset-0 animate-pulse bg-gray-100" />
              )}
              <Image
                src={src}
                alt=""
                fill
                sizes="64px"
                className={`object-cover transition-opacity duration-300 ${
                  loadedImages[index] ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setLoadedImages((prev) => (prev[index] ? prev : { ...prev, [index]: true }))}
              />
            </button>
          ))}
        </div>
      )}
      {imageBox}
    </div>
  )
}
