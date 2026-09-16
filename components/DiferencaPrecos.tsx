// components/DiferencaPrecos.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'

// Seccao "A diferenca que ninguem te mostra" - REDESIGN pedido pelo Jorge
// (mockup exato fornecido, "Desenvolve exatamente igual tamanho e tudo").
// Mostra o preco do mesmo produto em ate 4 lojas reais, sempre da mais
// barata para a mais cara ("Ordenar por: preco mais baixo" e sempre assim,
// nao e um menu funcional - confirmado com o Jorge) - nunca lojas, precos,
// portes ou PRAZOS DE ENTREGA inventados. O mockup original do Jorge tinha
// um prazo de entrega por loja (“2 dias”, “3 dias”) que nao existe em lado
// nenhum dos nossos dados - combinado com o Jorge (perguntado antes de
// avancar): esse elemento fica de fora, so aparece o que e real (preco,
// "Melhor preco" e portes gratis/custo de envio quando ha dados fiaveis).
//
// Logo real da loja e logica de portes - mesma abordagem ja usada e
// validada em components/StoreOffersList.tsx, duplicada aqui de proposito
// (mesmo criterio de sempre nesta seccao: independente, para nao arriscar
// mexer num componente ja validado). getProductsWithPrice.ts (que alimenta
// esta seccao, via a homepage) so traz shipping_base_fee/shipping_free_threshold
// por loja, nao shipping_info - por isso a variante "texto" mais detalhada
// do StoreOffersList (que depende de shipping_info) fica de fora aqui; so
// se mostra o selo "Portes gratis" quando os dados garantem mesmo isso.
const BRAND_ICON_SLUGS: Record<string, string> = {
  'nike.com': 'nike',
  'adidas.pt': 'adidas',
  'newbalance.pt': 'newbalance',
  'zalando.pt': 'zalando',
}

const STORE_LOGO_URLS: Record<string, string> = {
  'collectkicks.pt': 'https://collectkicks.pt/cdn/shop/files/logo_s_fundo_180x.png?v=1682350995',
  'footdistrict.com': 'https://footdistrict.com/cdn/shop/files/Logo_7d9512d9-6a65-44bd-b120-1a0ff1b8cbad.png',
  'vans.com': 'https://assets.vans.eu/image/upload/v1755503693/default.svg',
  'asics.com': 'https://www.asics.com/us/mobify/bundle/9379/static/img/global/favicon_512x512.png',
}

function storeLogoSrc(domain: string) {
  const slug = BRAND_ICON_SLUGS[domain]
  if (slug) return `https://cdn.simpleicons.org/${slug}`
  const direct = STORE_LOGO_URLS[domain]
  if (direct) return direct
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

function domainFromBaseUrl(baseUrl: string | null | undefined): string {
  if (!baseUrl) return ''
  try {
    return new URL(baseUrl).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// Só mostra o selo "Portes grátis" quando o preço real desta loja já atinge
// o limiar - sem isso, ou sem limiar conhecido, não mostra nada (nunca um
// prazo/condição de envio a adivinhar).
function isFreeShipping(price: number, threshold: number | null): boolean {
  return threshold != null && price >= threshold
}

function bestPricePerStore(product: ProductWithPrice) {
  const grouped = new Map<
    string,
    { price: number; oldestCheckedAt: string | null; domain: string; threshold: number | null }
  >()
  for (const offer of product.product_offers ?? []) {
    if (!offer.in_stock || !offer.stores) continue
    const current = grouped.get(offer.stores.name)
    const isCheaper = current == null || offer.price < current.price
    const oldestCheckedAt =
      current?.oldestCheckedAt == null || offer.last_checked_at < current.oldestCheckedAt
        ? offer.last_checked_at
        : current.oldestCheckedAt
    grouped.set(offer.stores.name, {
      price: isCheaper ? offer.price : current!.price,
      oldestCheckedAt,
      domain: domainFromBaseUrl(offer.stores.base_url),
      threshold: offer.stores.shipping_free_threshold,
    })
  }
  // Sempre do mais barato para o mais caro - a etiqueta "Ordenar por: preço
  // mais baixo" reflete sempre a ordem real da lista, nunca é só decorativa.
  return Array.from(grouped.entries())
    .map(([store, { price, oldestCheckedAt, domain, threshold }]) => ({
      store,
      price,
      lastCheckedAt: oldestCheckedAt,
      domain,
      threshold,
    }))
    .sort((a, b) => a.price - b.price)
}

// "verificado hoje as HH:MM" quando a oferta foi mesmo verificada hoje
// (a partir da data real), senao cai para "verificado ha X dias" - nunca
// uma hora inventada.
function formatVerifiedLabel(lastCheckedAt: string | null): string | null {
  if (!lastCheckedAt) return null
  const checked = new Date(lastCheckedAt)
  const now = new Date()
  const sameDay =
    checked.getFullYear() === now.getFullYear() &&
    checked.getMonth() === now.getMonth() &&
    checked.getDate() === now.getDate()
  if (sameDay) {
    const time = checked.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    return `verificado hoje às ${time}`
  }
  const diffDays = Math.round((now.getTime() - checked.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'verificado hoje'
  return `verificado há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
}

const COUNT_WORDS: Record<number, string> = { 2: 'dois', 3: 'três', 4: 'quatro' }

// Ícones simples (mesmo estilo de traço fino usado no resto do site - ver o
// ícone de "camadas" já usado no aviso do /comparar em app/comparar/page.tsx)
function LayersIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  )
}

function TagIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.82Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" />
    </svg>
  )
}

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function TruckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="6" width="13" height="11" rx="1.5" />
      <path d="M14 10h4l4 4v3h-8z" />
      <circle cx="6" cy="19" r="1.7" />
      <circle cx="17.5" cy="19" r="1.7" />
    </svg>
  )
}

function ShieldIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4.5 6v5.5C4.5 16.5 7.8 20.5 12 21.5c4.2-1 7.5-5 7.5-10V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function ChevronIcon({ direction, className = 'h-4 w-4' }: { direction: 'left' | 'right'; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

const INFO_ITEMS = [
  { Icon: SearchIcon, text: 'Compara preços em várias lojas' },
  { Icon: TruckIcon, text: 'Vê o stock e os tamanhos' },
  { Icon: ShieldIcon, text: 'Compra com mais confiança' },
]

export default function DiferencaPrecos({ product }: { product?: ProductWithPrice | null }) {
  const storeRows = product ? bestPricePerStore(product).slice(0, 4) : []
  const images = product?.image_urls?.length ? product.image_urls : product?.image_url ? [product.image_url] : []
  const [imageIndex, setImageIndex] = useState(0)

  if (!product || storeRows.length < 2) return null

  const cheapest = storeRows[0]
  const priciest = storeRows[storeRows.length - 1]
  const savings = priciest.price - cheapest.price
  const verifiedLabel = formatVerifiedLabel(cheapest.lastCheckedAt)
  const currentImage = images[imageIndex] ?? null

  function prevImage() {
    setImageIndex((i) => (i - 1 + images.length) % images.length)
  }
  function nextImage() {
    setImageIndex((i) => (i + 1) % images.length)
  }

  return (
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden bg-[#EFEBE2] py-16 sm:py-20">
      <div className="relative mx-auto grid max-w-7xl gap-14 px-6 sm:grid-cols-2 sm:items-center sm:gap-16 sm:px-12">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1F5F58]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#1F5F58]">
            <LayersIcon className="h-3.5 w-3.5" />
            O mesmo ténis, {COUNT_WORDS[storeRows.length] ?? storeRows.length} preços
          </span>
          <h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold leading-tight text-gray-900">
            A diferença que ninguém te mostra.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-gray-600">
            Alinhamos o preço do mesmo modelo nas lojas parceiras. A tua poupança é a
            distância entre a primeira e a última linha.
          </p>
          <p className="mt-6 flex flex-wrap items-center gap-3 text-4xl sm:text-5xl font-extrabold text-gray-900">
            {formatPrice(cheapest.price)}
            {savings > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1F5F58]/10 px-3 py-1 align-middle text-sm font-bold text-[#1F5F58]">
                <TagIcon />
                Poupa {formatPrice(savings)}
              </span>
            )}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {product.model_name}
            {verifiedLabel ? ` · ${verifiedLabel}` : ''}
          </p>
          <Link
            href={`/produto/${product.slug}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1F5F58] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a4e48]"
          >
            Ver este par
            <ChevronIcon direction="right" className="h-3.5 w-3.5" />
          </Link>

          <div className="mt-8 grid grid-cols-3 gap-4">
            {INFO_ITEMS.map(({ Icon, text }) => (
              <div key={text} className="flex flex-col gap-2">
                <Icon className="h-5 w-5 text-gray-700" />
                <p className="text-xs leading-snug text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          {currentImage ? (
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage}
                alt={product.model_name}
                loading="lazy"
                className="h-full w-full object-contain"
              />

              <div className="absolute right-4 top-4 rounded-xl bg-white px-3 py-2 text-right shadow-md ring-1 ring-black/5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {product.brands?.name}
                </p>
                <p className="text-sm font-bold text-gray-900">{product.model_name}</p>
              </div>

              {images.length > 1 && (
                <>
                  <div className="absolute right-4 top-1/2 flex -translate-y-1/2 gap-2">
                    <button
                      type="button"
                      onClick={prevImage}
                      aria-label="Foto anterior"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-black/5 hover:bg-gray-50"
                    >
                      <ChevronIcon direction="left" />
                    </button>
                    <button
                      type="button"
                      onClick={nextImage}
                      aria-label="Foto seguinte"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-black/5 hover:bg-gray-50"
                    >
                      <ChevronIcon direction="right" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 right-4 flex gap-1.5">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${i === imageIndex ? 'bg-gray-900' : 'bg-white/70'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}

          <div
            className={`overflow-hidden rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-black/5 ${
              currentImage
                ? 'mt-6 w-full sm:absolute sm:mt-0 sm:bottom-0 sm:-right-6 sm:w-[85%] sm:max-w-sm'
                : ''
            }`}
          >
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Onde comprar</span>
              <span className="text-[11px] text-gray-400">Ordenar por: preço mais baixo</span>
            </div>
            {storeRows.map((row, i) => {
              const isBest = i === 0
              const freeShipping = isFreeShipping(row.price, row.threshold)
              return (
                <div
                  key={row.store}
                  className={`flex items-center justify-between gap-3 px-3.5 py-3.5 transition-colors ${
                    isBest ? 'rounded-lg bg-gray-900' : ''
                  } ${i > 0 && !isBest ? 'border-t border-gray-100' : ''}`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`text-xs font-bold shrink-0 ${isBest ? 'text-white/50' : 'text-gray-400'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {row.domain && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={storeLogoSrc(row.domain)}
                          alt=""
                          aria-hidden="true"
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </span>
                    )}
                    <span className="min-w-0 flex flex-col">
                      <span className={`truncate text-sm ${isBest ? 'font-bold text-white' : 'text-gray-600'}`}>
                        {row.store}
                      </span>
                      {(isBest || freeShipping) && (
                        <span className="flex flex-wrap gap-1 mt-0.5">
                          {isBest && (
                            <span className="inline-flex items-center rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                              Melhor preço
                            </span>
                          )}
                          {freeShipping && (
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                isBest ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              Portes grátis
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm ${isBest ? 'font-extrabold text-white' : 'text-gray-400'}`}>
                    {formatPrice(row.price)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
