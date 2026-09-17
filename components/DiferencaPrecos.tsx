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

// Versão compacta do mesmo label real (sem o prefixo "verificado "), para
// caber ao lado do selo de portes grátis em cada linha da lista de lojas -
// mesma data real, só o texto mais curto.
function formatShortVerified(lastCheckedAt: string | null): string | null {
  const full = formatVerifiedLabel(lastCheckedAt)
  return full ? full.replace(/^verificado /, '') : null
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

function ClockIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
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

function ChevronDownIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
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
    // Pedido do Jorge: paleta "premium/editorial" exata (fundo quase branco,
    // verde só como acento em botões/badges, nunca a preencher a interface).
    // Cores exatas que pediu: fundo #F7F8F7, texto principal #17232B, texto
    // secundário #68747C, verde de marca #123F3A, verde claro (só para o
    // fundo dos pequenos badges) #E8F2EF.
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden bg-[#F7F8F7] py-14 sm:py-16">
      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 sm:grid-cols-2 sm:items-center sm:gap-14 sm:px-12">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F2EF] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#123F3A]">
            <LayersIcon className="h-3.5 w-3.5" />
            O mesmo ténis, {COUNT_WORDS[storeRows.length] ?? storeRows.length} preços
          </span>
          {/* Pedido do Jorge: hierarquia editorial muito mais forte - título
              e preço bem maiores do que antes, para serem claramente os
              protagonistas da secção. */}
          <h2 className="font-display mt-4 text-4xl sm:text-6xl font-bold leading-[1.05] text-[#17232B]">
            A diferença que ninguém te mostra.
          </h2>
          <p className="mt-5 max-w-md text-base sm:text-lg text-[#68747C]">
            Alinhamos o preço do mesmo modelo nas lojas parceiras. A tua poupança é a
            distância entre a primeira e a última linha.
          </p>
          <p className="mt-8 flex flex-wrap items-center gap-3 text-5xl sm:text-6xl font-extrabold text-[#17232B]">
            {formatPrice(cheapest.price)}
            {savings > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F2EF] px-3 py-1 align-middle text-sm font-bold text-[#123F3A]">
                <TagIcon />
                Poupa {formatPrice(savings)}
              </span>
            )}
          </p>
          <p className="mt-2 text-xs text-[#68747C]">
            {product.model_name}
            {verifiedLabel ? ` · ${verifiedLabel}` : ''}
          </p>
          {/* Confirmado com o Jorge a partir da imagem de referência real:
              o botão é mesmo pílula (rounded-full), não rounded-xl como uma
              instrução em texto anterior tinha pedido - a imagem venceu por
              ser a referência final. */}
          <Link
            href={`/produto/${product.slug}`}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#123F3A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
          >
            Ver este par
            <ChevronIcon direction="right" className="h-3.5 w-3.5" />
          </Link>

          {/* Pedido do Jorge: separar os 3 benefícios com linhas verticais
              muito subtis, em vez de espaço em branco só (grid com gap). */}
          <div className="mt-10 flex items-start">
            {INFO_ITEMS.map(({ Icon, text }, i) => (
              <div
                key={text}
                className={`flex flex-1 flex-col gap-2 ${
                  i > 0 ? 'ml-4 border-l border-[#E1E4E3] pl-4' : ''
                }`}
              >
                <Icon className="h-5 w-5 text-[#17232B]" />
                <p className="text-xs leading-snug text-[#68747C]">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          {currentImage ? (
            // Comparação pixel-a-pixel com a imagem de referência real que o
            // Jorge enviou (medi as coordenadas na própria imagem, não é a
            // olho): o card "Onde comprar" fica quase inteiramente DENTRO do
            // "product stage" - só uma faixa fina do lado esquerdo do card é
            // que sai para fora do stage, para a esquerda. A técnica
            // continua a ser segura e independente da altura do card (2, 3
            // ou 4 lojas): a caixa exterior do stage reserva uma zona vazia
            // fixa depois da foto ("pb-[180px]"), e o card é puxado para
            // cima por uma quantidade FIXA ("sm:-mt-[164px]") para dentro
            // dessa reserva - sobram sempre os mesmos 16px de margem de
            // segurança entre o fim da foto e o topo do card, nunca toca no
            // ténis, seja qual for a altura do card. sm:-ml-8 desloca o
            // card ligeiramente para a esquerda, a transbordar para fora do
            // stage, tal como confirmado na imagem de referência.
            //
            // Achado técnico importante (também confirmado a comparar com a
            // referência): o "product stage" não pode ter o mesmo fundo da
            // secção (#F7F8F7) - tem de ser uma cor própria, ligeiramente
            // diferente (#EDEFEE), senão a zona de reserva fica invisível
            // (misturada com o fundo da página) e a sobreposição do card
            // parece não fazer efeito nenhum visualmente, mesmo estando
            // matematicamente correta.
            //
            // Segundo achado (reportado pelo Jorge depois do 1º deploy, com
            // print anotado a mostrar um espaço grande a mais entre o ténis
            // e o card): as fotos reais dos produtos (verificado neste e
            // noutros modelos) são quadradas mas o ténis só ocupa ~34% da
            // altura da foto - o resto é fundo de estúdio vazio, à volta de
            // todo o ténis (~33% acima, ~32% abaixo), independentemente do
            // stage ser quadrado ou não. Isso não tem nada a ver com o
            // "pb-[180px]"/"-mt-[164px]" (esses continuam corretos, dão
            // sempre os mesmos 16px de folga entre o fim da FOTO e o topo do
            // card) - o espaço extra vinha de dentro da própria foto. Corrigi
            // trocando o stage de quadrado ("aspect-square") para retangular
            // ("aspect-[2/1]") e a imagem de "object-contain" para
            // "object-cover": como a foto de origem é quadrada e a caixa
            // ficou mais larga que alta, o corte do "cover" tira sempre a
            // mesma fatia de cima E de baixo (nunca dos lados, que já
            // estavam justos), aproximando o ténis do card sem cortar as
            // pontas do ténis - testado e confirmado visualmente com a foto
            // real do Campus 00s antes de aplicar.
            <div className="relative overflow-visible rounded-[20px] bg-[#EDEFEE] pb-[180px]">
              <div className="relative aspect-[2/1] w-full overflow-hidden rounded-[20px]">
                <div className="absolute inset-0 p-6 sm:p-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImage}
                    alt={product.model_name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="absolute right-4 top-4 rounded-xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-black/5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#68747C]">
                    {product.brands?.name}
                  </p>
                  <p className="text-sm font-bold text-[#17232B]">{product.model_name}</p>
                </div>

                {images.length > 1 && (
                  <>
                    {/* Confirmado com a imagem de referência: as setas do
                        carrossel ficam centradas verticalmente na foto,
                        junto à borda direita - separadas da etiqueta de
                        marca (que fica só no topo), dentro do card
                        cinzento. */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                      <button
                        type="button"
                        onClick={prevImage}
                        aria-label="Foto anterior"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#17232B] shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                      >
                        <ChevronIcon direction="left" />
                      </button>
                      <button
                        type="button"
                        onClick={nextImage}
                        aria-label="Foto seguinte"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#17232B] shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                      >
                        <ChevronIcon direction="right" />
                      </button>
                    </div>
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                      {images.map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-2 rounded-full ring-1 ring-black/10 transition-colors ${
                            i === imageIndex ? 'bg-[#123F3A]' : 'bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Medi a proporção real na imagem de referência (card ≈64% da
              largura do "product stage") em vez de usar o valor em pixels
              (570-620px) que o Jorge tinha estimado a olho - esse número
              assumia uma página mais larga do que o nosso layout real
              (max-w-7xl). 72% (em vez dos 64% exatos da imagem) é o valor
              mínimo que ainda evita que o texto de cada loja (ex.: "Grátis
              · hoje às 06:22") quebre a meio da linha - testado e
              confirmado visualmente. Continua claramente mais estreito do
              que a imagem toda, com folga cinzenta visível à direita
              (onde ficam as setas e os dots), tal como na referência. */}
          <div
            className={`relative z-10 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${
              currentImage ? 'mt-4 w-full sm:w-[72%] sm:-mt-[164px] sm:-ml-16' : ''
            }`}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#68747C]">Onde comprar</span>
              {/* Seta decorativa junto ao texto, como na imagem de
                  referência - continua a não ser um menu funcional
                  (confirmado com o Jorge, não temos outros critérios de
                  ordenação além de preço mais baixo). */}
              <span className="flex items-center gap-1 text-[11px] text-[#68747C]">
                Ordenar por: preço mais baixo
                <ChevronDownIcon className="h-3 w-3" />
              </span>
            </div>
            {storeRows.map((row, i) => {
              const isBest = i === 0
              const freeShipping = isFreeShipping(row.price, row.threshold)
              const shortVerified = formatShortVerified(row.lastCheckedAt)
              return (
                <div
                  key={row.store}
                  className={`flex items-center justify-between gap-3 px-5 py-4 ${
                    i > 0 ? 'border-t border-gray-100' : ''
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="text-xs font-bold shrink-0 text-[#68747C]">
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
                      <span className="truncate text-sm font-medium text-[#17232B]">{row.store}</span>
                      {/* Só o que é real: nota discreta de portes grátis quando o
                          preço já atinge o limiar conhecido dessa loja, e a
                          data em que o preço desta loja foi mesmo verificado
                          (last_checked_at real da oferta) - sem prazo de
                          entrega inventado (não temos esse dado - combinado
                          com o Jorge). */}
                      {(freeShipping || shortVerified) && (
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[#68747C]">
                          {freeShipping && (
                            <span className="flex items-center gap-1">
                              <TruckIcon className="h-3 w-3" />
                              Grátis
                            </span>
                          )}
                          {shortVerified && (
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-3 w-3" />
                              {shortVerified}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {/* Pedido do Jorge: preços sempre em carvão (nunca
                        esbatidos a cinzento-claro) - a diferença entre a
                        melhor oferta e as restantes vem do peso da fonte e
                        do selo "Melhor preço", não da cor do preço em si. */}
                    <span className={`text-sm text-[#17232B] ${isBest ? 'font-extrabold' : 'font-normal'}`}>
                      {formatPrice(row.price)}
                    </span>
                    {isBest && (
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#123F3A] px-2 py-1 text-[10px] font-semibold text-white">
                        Melhor preço
                      </span>
                    )}
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
