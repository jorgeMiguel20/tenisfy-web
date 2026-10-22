// components/CardCarousel.tsx
'use client'

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

// Carrossel horizontal da secção "Maior poupança agora" da homepage.
// - Telemóvel: fila que se desliza com o dedo, com cartões pequenos (cerca de
//   2 e meio visíveis, para se perceber que há mais) e pontinhos por baixo.
// - Computador: cartões pequenos lado a lado; as setas só aparecem se houver
//   cartões a mais para caberem.
// O cabeçalho (rótulo + título) e o link vêm de fora; as setas ficam ao lado
// do link.
export default function CardCarousel({
  heading,
  link,
  children,
}: {
  heading: ReactNode
  link: ReactNode
  children: ReactNode
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [active, setActive] = useState(0)
  const count = Children.count(children)

  const update = useCallback(() => {
    const el = railRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    const first = el.firstElementChild as HTMLElement | null
    const step = first ? first.offsetWidth + 12 : 1
    setActive(Math.min(count - 1, Math.round(el.scrollLeft / step)))
  }, [count])

  useEffect(() => {
    update()
    const el = railRef.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update])

  function scrollByCard(direction: 1 | -1) {
    const el = railRef.current
    if (!el) return
    const first = el.firstElementChild as HTMLElement | null
    const step = first ? first.offsetWidth + 12 : el.clientWidth / 2
    el.scrollBy({ left: direction * step * 2, behavior: 'smooth' })
  }

  function goTo(index: number) {
    const el = railRef.current
    if (!el) return
    const first = el.firstElementChild as HTMLElement | null
    const step = first ? first.offsetWidth + 12 : 1
    el.scrollTo({ left: index * step, behavior: 'smooth' })
  }

  const arrowClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-none border border-[#17232B]/20 text-[#17232B] transition-colors hover:bg-[#F9FBFC] disabled:cursor-not-allowed disabled:opacity-30'

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>{heading}</div>
        <div className="flex items-center gap-4">
          {(canPrev || canNext) && (
            <div className="hidden items-center gap-1.5 sm:flex">
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                disabled={!canPrev}
                aria-label="Ver anteriores"
                className={arrowClass}
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                disabled={!canNext}
                aria-label="Ver seguintes"
                className={arrowClass}
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          )}
          {link}
        </div>
      </div>

      {/* -mx-6/px-6: no telemóvel a fila vai de ponta a ponta do ecrã, para os
          cartões aparecerem a ser cortados à direita. */}
      <div
        ref={railRef}
        className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <div className="w-[44vw] min-w-[150px] max-w-[190px] shrink-0 snap-start sm:w-[240px] sm:max-w-none">
            {child}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center gap-1.5 sm:hidden" aria-hidden="true">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className={`h-1.5 w-1.5 rounded-full ${i === active ? 'bg-[#17232B]' : 'bg-[#C5CCD2]'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
