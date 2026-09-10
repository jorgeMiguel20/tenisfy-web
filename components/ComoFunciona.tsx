// components/ComoFunciona.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { formatPrice } from '@/lib/formatPrice'
import { buildOfferUrl } from '@/lib/offerUrl'
import type { ProductWithPrice } from '@/lib/types'

const STEPS = [
  {
    title: 'Pesquisa por texto ou por foto',
    text: 'Escreve o modelo que procuras ou tira uma foto — os dois caminhos levam ao mesmo catálogo, que cresce todas as semanas com o que está mesmo à venda nas lojas.',
    image: '/marketing/step-search.jpg',
  },
  {
    title: 'Compara preços entre lojas',
    text: 'Só tamanhos que existem mesmo em stock, sem letras pequenas — vês o preço final, com portes incluídos quando aplicável.',
    image: '/marketing/step-compare.jpg',
  },
  {
    title: 'Compra na loja com melhor preço',
    text: 'Sem custo extra, direto à loja com a melhor oferta para o teu tamanho.',
    image: '/marketing/step-buy.jpg',
  },
]

// Melhor preço por loja (mesma ideia de groupOffers em app/comparar/page.tsx),
// para a mini-tabela do passo 2 - sempre a partir de ofertas reais em stock,
// nunca os nomes/preços fixos de um mockup.
// Logo real da marca para as lojas mais conhecidas, a partir da biblioteca
// aberta Simple Icons (simpleicons.org) - so marcas globais que la existem
// (Nike, adidas, New Balance, Zalando, etc.). Para as restantes lojas
// (revendedores mais pequenos/regionais sem logo nessa biblioteca) usamos o
// favicon do proprio site como alternativa - nunca inventamos um logo.
const BRAND_ICON_SLUGS: Record<string, string> = {
  'nike.com': 'nike',
  'adidas.pt': 'adidas',
  'newbalance.pt': 'newbalance',
  'zalando.pt': 'zalando',
}

// Logo oficial hospedado no proprio site da loja - para lojas mais
// pequenas/regionais sem entrada no Simple Icons. Encontrado a olho em
// cada site oficial (cabecalho ou favicon de alta resolucao), nunca
// inventado. Se o link um dia deixar de funcionar, o onError no <img>
// abaixo cai para o favicon automaticamente.
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

// "Verificado há X" a partir da data real da oferta mais antiga em stock
// desta loja (pior caso - mesmo criterio "sempre honesto" ja usado no
// resto do site, ver formatVerifiedLabel em StoreOffersList.tsx) - nunca
// um numero inventado.
function formatVerifiedLabel(lastCheckedAt: string | null): string | null {
  if (!lastCheckedAt) return null

  const diffMs = Date.now() - new Date(lastCheckedAt).getTime()
  if (diffMs < 0) return 'Verificado agora mesmo'

  const diffHours = diffMs / (1000 * 60 * 60)
  if (diffHours < 1) return 'Verificado há menos de 1 hora'

  const roundedHours = Math.round(diffHours)
  if (roundedHours < 24) {
    return `Verificado há ${roundedHours} ${roundedHours === 1 ? 'hora' : 'horas'}`
  }

  const days = Math.round(diffHours / 24)
  return `Verificado há ${days} ${days === 1 ? 'dia' : 'dias'}`
}

function bestPricePerStore(product: ProductWithPrice) {
  const grouped = new Map<
    string,
    {
      price: number
      domain: string
      affiliateUrl: string
      affiliateUrlTemplate: string | null
      oldestCheckedAt: string | null
    }
  >()
  for (const offer of product.product_offers ?? []) {
    if (!offer.in_stock || !offer.stores) continue
    const current = grouped.get(offer.stores.name)
    // Dominio real da loja (vem de stores.base_url) - usado so para pedir
    // o favicon oficial do site, nunca inventamos nem guardamos logos.
    let domain = current?.domain ?? ''
    if (!current) {
      try {
        domain = new URL(offer.stores.base_url ?? '').hostname.replace(/^www\./, '')
      } catch {
        domain = ''
      }
    }
    const isCheaper = current == null || offer.price < current.price
    const oldestCheckedAt =
      current?.oldestCheckedAt == null || offer.last_checked_at < current.oldestCheckedAt
        ? offer.last_checked_at
        : current.oldestCheckedAt
    grouped.set(offer.stores.name, {
      price: isCheaper ? offer.price : current!.price,
      domain,
      affiliateUrl: isCheaper ? offer.affiliate_url : current!.affiliateUrl,
      affiliateUrlTemplate: offer.stores.affiliate_url_template,
      oldestCheckedAt,
    })
  }
  return Array.from(grouped.entries())
    .map(([store, { price, domain, affiliateUrl, affiliateUrlTemplate, oldestCheckedAt }]) => ({
      store,
      price,
      domain,
      affiliate_url: affiliateUrl,
      affiliate_url_template: affiliateUrlTemplate,
      lastCheckedAt: oldestCheckedAt,
    }))
    .sort((a, b) => a.price - b.price)
}

export default function ComoFunciona({
  showcaseProduct,
  hasNextSection = true,
}: {
  showcaseProduct?: ProductWithPrice | null
  // "Maior poupança agora" (a seguir a esta secção) só aparece quando há
  // descidas de preço reais - ver app/page.tsx. Sem isso, esta secção fica
  // por último na página e não precisa do espaço extra "mb-12" que existe
  // só para a separar da secção seguinte (o espaçamento normal antes do
  // rodapé já vem do próprio <main> e do rodapé, em qualquer página).
  hasNextSection?: boolean
}) {
  const [active, setActive] = useState(0)
  const touchStartX = useRef<number | null>(null)

  // Permite trocar de passo por swipe no mobile, para alem do avanco
  // automatico e do toque nos indicadores - as tres formas coexistem.
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (deltaX > 30) setActive((i) => (i - 1 + STEPS.length) % STEPS.length)
    else if (deltaX < -30) setActive((i) => (i + 1) % STEPS.length)
  }

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length)
    }, 4000)
    return () => clearInterval(id)
  }, [active])

  const storeRows = showcaseProduct ? bestPricePerStore(showcaseProduct) : []
  const hasCompareData = storeRows.length >= 2
  const hasBuyData = !!showcaseProduct?.lowest_price && !!showcaseProduct?.savings
  // CTA de poupanca do passo 3: liga a oferta real da loja mais barata
  // (por nome, a partir de storeRows ja calculado acima) - nunca inventa
  // um link; se por algum motivo o nome nao bater certo com nenhuma loja
  // de storeRows, cai para um <span> sem link em vez de arriscar um href
  // errado.
  const cheapestOfferForSavings = showcaseProduct?.savings
    ? storeRows.find((row) => row.store === showcaseProduct.savings!.store) ?? null
    : null

  return (
    <section className={`rounded-2xl bg-[#f3f0ea] p-6 sm:p-10 ${hasNextSection ? 'mb-12' : ''}`}>
      {/* bg-[#f3f0ea] (cinza-quente suave) - mesma logica do fundo creme
          adicionado ao CompararPreview.tsx: dar ritmo ao scroll com fundos
          alternados muito suaves, sem mudar a estrutura nem abusar do
          laranja (pedido do Jorge). */}
      <style>{`
        @keyframes scan-sweep {
          0% { transform: translateY(-100%); opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translateY(420%); opacity: 0; }
        }
        @keyframes scan-badge {
          0%, 55% { opacity: 0; transform: translateY(4px); }
          70%, 90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(4px); }
        }
        .scan-sweep { animation: scan-sweep 2.8s ease-in-out infinite; }
        .scan-badge { animation: scan-badge 2.8s ease-in-out infinite; }
      `}</style>

      <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
        Como funciona o Parjusto
      </h2>
      <p className="text-center text-sm text-gray-500 mb-8">Desliza pelos 3 passos</p>

      <div className="grid sm:grid-cols-2 rounded-2xl overflow-hidden shadow-lg mb-4">
        <div
          className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[280px] bg-gray-50"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            onClick={() => setActive((i) => (i - 1 + STEPS.length) % STEPS.length)}
            aria-label="Passo anterior"
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setActive((i) => (i + 1) % STEPS.length)}
            aria-label="Passo seguinte"
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
            </svg>
          </button>
          {active === 0 && (
            <div className="relative h-full w-full">
              <Image src={STEPS[0].image} alt={STEPS[0].title} fill className="object-cover object-[30%_center]" />
              {/* Sugere "análise em curso" sem fingir que reconhece o modelo
                  exato em tempo real sobre esta foto estática - a pesquisa
                  por foto de verdade só corre depois de a imagem ser
                  carregada (ver components/HeaderSearchBar.tsx). */}
              <div
                aria-hidden="true"
                className="scan-sweep pointer-events-none absolute inset-x-8 top-0 h-14 bg-gradient-to-b from-white/0 via-white/60 to-white/0 blur-sm"
              />
              <div
                aria-hidden="true"
                className="scan-badge pointer-events-none absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow"
              >
                <svg className="h-3.5 w-3.5 text-orange-600 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                A analisar imagem...
              </div>
            </div>
          )}

          {active === 1 &&
            (hasCompareData ? (
              <div className="flex h-full w-full items-center px-11 py-4 sm:px-14 sm:py-6">
                <div className="w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-900/5">
                  {storeRows.slice(0, 4).map((row, i) => {
                    const verifiedLabel = i === 0 ? formatVerifiedLabel(row.lastCheckedAt) : null
                    return (
                    <div
                      key={row.store}
                      className={`relative flex items-center justify-between gap-3 px-4 py-4 ${
                        i === 0 ? 'bg-gradient-to-r from-orange-50 via-orange-50/50 to-white' : 'bg-white'
                      } ${i > 0 ? 'border-t border-gray-100' : ''}`}
                    >
                      {i === 0 && (
                        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-orange-500" />
                      )}
                      <span className="flex min-w-0 items-center gap-3">
                        {/* Logo real da loja (favicon do site oficial, a partir do
                            dominio em stores.base_url) - nunca um logo inventado. */}
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-50 p-1.5 ring-1 ring-gray-100">
                          {row.domain ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={storeLogoSrc(row.domain)}
                              alt=""
                              aria-hidden="true"
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                // Se o logo direto do site da loja alguma vez deixar de
                                // funcionar, cai para o favicon em vez de ficar partido.
                                e.currentTarget.onerror = null
                                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${row.domain}&sz=128`
                              }}
                            />
                          ) : (
                            <span className="text-xs font-bold text-gray-400">{row.store.charAt(0)}</span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-gray-900">{row.store}</span>
                          {i === 0 && (
                            <>
                              <span className="mt-1 flex flex-wrap items-center gap-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                                  <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                                  </svg>
                                  Melhor preço
                                </span>
                                {storeRows[1] && storeRows[1].price > row.price && (
                                  <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                                    Poupa {formatPrice(storeRows[1].price - row.price)}
                                  </span>
                                )}
                              </span>
                              {verifiedLabel && (
                                <span className="mt-1 block text-[10px] text-gray-400">{verifiedLabel}</span>
                              )}
                            </>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span
                          className={`${
                            i === 0 ? 'text-base font-extrabold text-orange-600' : 'text-sm font-semibold text-gray-400'
                          }`}
                        >
                          {formatPrice(row.price)}
                        </span>
                        <a
                          href={buildOfferUrl(row)}
                          target="_blank"
                          rel="nofollow sponsored noopener"
                          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold text-white transition-colors ${
                            i === 0 ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-900 hover:bg-gray-700'
                          }`}
                        >
                          Ver oferta
                        </a>
                      </span>
                    </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <Image src={STEPS[1].image} alt={STEPS[1].title} fill className="object-cover" />
            ))}

          {active === 2 &&
            (hasBuyData ? (
              <div className="flex h-full w-full items-center gap-4 px-11 py-4 sm:px-14 sm:py-6">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-sm sm:h-24 sm:w-24">
                  {showcaseProduct!.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={showcaseProduct!.image_url}
                      alt={showcaseProduct!.model_name}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  {cheapestOfferForSavings ? (
                    <span className="flex items-center gap-1.5">
                      {/* Logo real da loja mais barata (mesma logica do passo 2,
                          a partir do dominio verificado em stores.base_url) -
                          fecha a historia comecada no passo 2 mostrando onde a
                          compra acontece de facto; nunca um logo inventado. */}
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-50 ring-1 ring-gray-100">
                        {cheapestOfferForSavings.domain ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={storeLogoSrc(cheapestOfferForSavings.domain)}
                            alt=""
                            aria-hidden="true"
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.onerror = null
                              e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${cheapestOfferForSavings.domain}&sz=128`
                            }}
                          />
                        ) : (
                          <span className="text-[8px] font-bold text-gray-400">
                            {cheapestOfferForSavings.store.charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="truncate text-[11px] font-semibold text-gray-500">
                        Compra na <span className="text-gray-700">{cheapestOfferForSavings.store}</span>
                      </span>
                    </span>
                  ) : (
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      {showcaseProduct!.brands?.name}
                    </p>
                  )}
                  <p className="truncate font-bold text-black">{showcaseProduct!.model_name}</p>
                  <p className="mt-1 text-xl font-extrabold text-orange-600">
                    {formatPrice(showcaseProduct!.lowest_price!)}
                  </p>
                  {/* Poupanca = diferenca real entre a oferta mais barata e a
                      mais cara (ver computeSavings em lib/savings.ts) - por
                      isso o texto compara com "a oferta mais cara", nunca com
                      um numero de ofertas ou posicao inventados. */}
                  <p className="mt-1 text-[11px] text-gray-400">
                    Poupas{' '}
                    <span className="font-semibold text-orange-700">
                      {formatPrice(showcaseProduct!.savings!.amount)}
                    </span>{' '}
                    face à oferta mais cara
                  </p>
                  {cheapestOfferForSavings && (
                    <a
                      href={buildOfferUrl(cheapestOfferForSavings)}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      className="mt-2 inline-block rounded-full bg-orange-600 px-4 py-2 text-xs font-extrabold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-lg"
                    >
                      Ver oferta na {cheapestOfferForSavings.store}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <Image src={STEPS[2].image} alt={STEPS[2].title} fill className="object-cover" />
            ))}
        </div>

        <div className="bg-white p-6 sm:p-10 flex flex-col justify-center">
          <span className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold mb-4">
            {active + 1}
          </span>
          <h3 className="font-bold text-lg text-gray-900 mb-2">{STEPS[active].title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{STEPS[active].text}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {STEPS.map((step, i) => (
          <button
            key={step.title}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={active === i}
            className={`text-left rounded-xl border p-4 transition-colors ${
              active === i ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-xs font-semibold text-gray-400">{i + 1}. </span>
            <span className="text-xs font-semibold text-gray-700">{step.title}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
