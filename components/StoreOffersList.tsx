// components/StoreOffersList.tsx
'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/formatPrice'
import { buildOfferUrl } from '@/lib/offerUrl'

// Redesenho da lista de lojas na página de produto: cards em vez da tabela
// antiga, um por loja. Ver pedido do Jorge ("Redesenhar a lista de lojas na
// página de produto") - mockup de referência aprovado por ele.

// Logo real da loja - mesma logica e mesmas fontes ja usadas e verificadas
// em components/ComoFunciona.tsx (Simple Icons para marcas globais, logo
// oficial hospedado no proprio site para lojas mais pequenas, favicon como
// ultimo recurso). Duplicado aqui de proposito em vez de partilhado, para
// nao arriscar mexer no ComoFunciona.tsx que ja esta validado em producao.
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

export type StoreOfferSize = { size: string; inStock: boolean }

export type StoreOfferForDisplay = {
  store: string
  domain: string
  price: number
  affiliate_url: string
  affiliate_url_template: string | null
  shipping_info: string | null
  shipping_base_fee: number | null
  shipping_free_threshold: number | null
  // Mais antiga entre as ofertas EM STOCK desta loja (mesmo critério "pior
  // caso" já usado no resto da página) - null só se faltarem mesmo os dados.
  lastCheckedAt: string | null
  sizes: StoreOfferSize[]
}

type ShippingDisplay = { type: 'badge'; text: string } | { type: 'text'; text: string }

function getShippingDisplay(offer: StoreOfferForDisplay): ShippingDisplay | null {
  const { shipping_free_threshold: threshold, shipping_base_fee: fee, shipping_info, store, price } = offer

  if (threshold == null) {
    return shipping_info ? { type: 'text', text: shipping_info } : null
  }

  if (price >= threshold) {
    return { type: 'badge', text: 'Portes Grátis' }
  }

  // Nike: abaixo do limiar o envio depende do estatuto de membro, que não
  // temos - mantém o texto estático em vez de calcular.
  if (store === 'Nike Oficial') {
    return shipping_info ? { type: 'text', text: shipping_info } : null
  }

  if (fee != null) {
    return { type: 'text', text: `+${formatPrice(fee)} envio (grátis acima de ${formatPrice(threshold)})` }
  }

  return { type: 'text', text: `Grátis acima de ${formatPrice(threshold)}` }
}

// "Verificado há X horas/dias" - por loja, não uma data única para o
// produto todo (ver pedido do Jorge). Calculado a partir da oferta em stock
// mais antiga dessa loja (lastCheckedAt), o mesmo critério "pior caso" já
// usado no resto da página para o preço mostrado ser sempre honesto.
function formatVerifiedLabel(lastCheckedAt: string | null): string | null {
  if (!lastCheckedAt) return null

  const diffMs = Date.now() - new Date(lastCheckedAt).getTime()
  if (diffMs < 0) return 'Verificado agora mesmo'

  const diffHours = diffMs / (1000 * 60 * 60)
  if (diffHours < 1) return 'Verificado há menos de 1 hora'

  // Arredondar primeiro e só depois decidir horas vs. dias - antes
  // arredondava só dentro do "if (diffHours < 24)", e algo como 23.6h
  // arredondava para "24 horas" em vez de passar a "1 dia" (por isso é
  // que apareciam ofertas quase com a mesma idade, uma em "horas" e outra
  // já em "dias") - inconsistente. Ver pedido do Jorge.
  const roundedHours = Math.round(diffHours)
  if (roundedHours < 24) {
    return `Verificado há ${roundedHours} ${roundedHours === 1 ? 'hora' : 'horas'}`
  }

  const days = Math.round(diffHours / 24)
  return `Verificado há ${days} ${days === 1 ? 'dia' : 'dias'}`
}

const VISIBLE_COUNT = 5

function StoreOfferCard({
  offer,
  isBest,
  selectedSize,
  onSelectSize,
}: {
  offer: StoreOfferForDisplay
  isBest: boolean
  selectedSize: string | null
  onSelectSize: (size: string) => void
}) {
  const shipping = getShippingDisplay(offer)
  const verifiedLabel = formatVerifiedLabel(offer.lastCheckedAt)

  return (
    <div className="rounded-2xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-50 p-1 ring-1 ring-gray-100">
            {offer.domain ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={storeLogoSrc(offer.domain)}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${offer.domain}&sz=128`
                }}
              />
            ) : (
              <span className="text-[10px] font-bold text-gray-400">{offer.store.charAt(0)}</span>
            )}
          </span>
          <span className="font-semibold text-gray-900">{offer.store}</span>
          {isBest && (
            <span className="inline-flex items-center bg-green-50 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              Melhor preço
            </span>
          )}
          {shipping?.type === 'badge' && (
            <span className="inline-flex items-center bg-green-50 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {shipping.text}
            </span>
          )}
        </div>

        {(verifiedLabel || shipping?.type === 'text') && (
          <p className="text-xs text-gray-400 mt-1">
            {verifiedLabel}
            {verifiedLabel && shipping?.type === 'text' && ' · '}
            {shipping?.type === 'text' && shipping.text}
          </p>
        )}

        {offer.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {offer.sizes.map((s) => (
              <button
                key={s.size}
                type="button"
                disabled={!s.inStock}
                onClick={() => onSelectSize(s.size)}
                title={s.inStock ? undefined : 'Esgotado nesta loja'}
                className={`inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2 rounded-md border text-xs font-medium transition-colors ${
                  !s.inStock
                    ? 'border-gray-100 text-gray-300 bg-gray-50 line-through cursor-not-allowed'
                    : selectedSize === s.size
                    ? 'border-orange-500 text-orange-600 bg-orange-50'
                    : 'border-gray-200 text-gray-700 bg-white hover:border-gray-400'
                }`}
              >
                {s.size}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
        <span className="text-2xl font-bold text-gray-900">{formatPrice(offer.price)}</span>
        <a
          href={buildOfferUrl(offer)}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium text-center hover:bg-gray-700 transition-colors"
        >
          Ver oferta
        </a>
      </div>
    </div>
  )
}

export default function StoreOffersList({ offers }: { offers: StoreOfferForDisplay[] }) {
  const [expanded, setExpanded] = useState(false)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  // A lista já vem ordenada da mais barata para a mais cara (ver
  // app/produto/[slug]/page.tsx) - aqui só decide quantas mostrar.
  const visibleOffers = expanded ? offers : offers.slice(0, VISIBLE_COUNT)
  const hasMore = offers.length > VISIBLE_COUNT

  return (
    <div className="flex flex-col gap-3">
      {visibleOffers.map((offer, index) => (
        <StoreOfferCard
          key={offer.store}
          offer={offer}
          isBest={index === 0 && offers.length > 1}
          selectedSize={selectedSize}
          onSelectSize={(size) => setSelectedSize((prev) => (prev === size ? null : size))}
        />
      ))}

      {hasMore && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors self-center mt-1"
        >
          Mostrar mais lojas ({offers.length - VISIBLE_COUNT})
        </button>
      )}

      {offers.some((offer) => getShippingDisplay(offer)) && (
        <p className="text-xs text-gray-400 mt-1">
          As taxas de envio são estimadas (Portugal continental). Confirma sempre na loja antes de finalizar a compra.
        </p>
      )}
    </div>
  )
}
