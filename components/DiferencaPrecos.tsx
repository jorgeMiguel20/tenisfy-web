// components/DiferencaPrecos.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'

// Seccao "A diferenca que ninguem te mostra" - historial resumido: nasceu
// como um REDESIGN pedido pelo Jorge a partir de um mockup exato, e mostrava
// o produto com maior poupanca real do catalogo (escolhido automaticamente
// em app/page.tsx), com um carrossel a percorrer as fotos desse produto
// vindas da Supabase. Depois de varios ajustes de enquadramento (guardados
// no historico do repo) para nunca cortar o tenis em nenhuma das fotos
// imprevisiveis desse carrossel, o Jorge pediu uma segunda redesign (ver
// commit desta alteracao): a seccao passa a ser SEMPRE o Vans Old Skool -
// "os vans tem sempre disponivel em varias lojas" - em vez de escolha
// automatica, e a foto deixa de vir do catalogo (fotos de estudio dos
// cards): usa-se uma foto lifestyle real (skate, fornecida pelo Jorge,
// escolhida entre 5 - as outras mostravam relogio/tatuagem a distrair, ou
// (a da ponte) pes pendurados no ar com muita altura, pouco apropriado para
// uma loja) para "aumentar a qualidade da home page". Como e uma UNICA foto
// fixa (nunca muda), o enquadramento pode ser calibrado uma vez com
// seguranca - por isso o carrossel de fotos (setas, pontinhos, logica de
// nunca cortar fotos desconhecidas) foi removido; ver heroImageSrc mais
// abaixo.
//
// Continua tudo o resto: preco/lojas SEMPRE reais (nunca inventados), sempre
// ordenado do mais barato para o mais caro ("Ordenar por: preco mais baixo"
// e sempre assim, confirmado com o Jorge, nao e um menu funcional). Prazos
// de entrega continuam de fora de proposito - nao existem em lado nenhum
// dos nossos dados (nem shipping_info, so shipping_base_fee/
// shipping_free_threshold), confirmado outra vez com o Jorge nesta ronda.
//
// Logo real da loja e logica de portes - mesma abordagem ja usada e
// validada em components/StoreOffersList.tsx, duplicada aqui de proposito
// (mesmo criterio de sempre nesta seccao: independente, para nao arriscar
// mexer num componente ja validado).
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

// Ícones simples (mesmo estilo de traço fino usado no resto do site)
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

function ChevronIcon({ direction, className = 'h-4 w-4' }: { direction: 'left' | 'right'; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

export default function DiferencaPrecos({
  product,
  heroImageSrc,
  heroImageSrcMobile,
}: {
  product?: ProductWithPrice | null
  // Foto lifestyle fixa (pedido do Jorge, ver nota acima) - vem sempre de
  // app/page.tsx como um ficheiro estático do site (public/marketing/...),
  // nunca de product.image_url/image_urls (fotos de estúdio dos cards).
  heroImageSrc: string
  // Versão mais pequena (mesmo recorte, 800px em vez de 1600px) da mesma
  // foto, só para telemóveis não descarregarem a versão de ecrã grande à
  // toa (afinação de performance pedida pelo Jorge - "refinar, não
  // redesenhar": a foto em si mantém-se exatamente igual, só passa a haver
  // um segundo tamanho). Opcional para não partir nada se um dia faltar.
  heroImageSrcMobile?: string
}) {
  const storeRows = product ? bestPricePerStore(product).slice(0, 4) : []
  const [storeIndex, setStoreIndex] = useState(0)
  const storeCount = storeRows.length

  // Correção a pedido do Jorge: não é um carrossel manual (setas/clique) -
  // as 3 lojas ficam sempre todas visíveis, e o destaque avança sozinho de
  // loja em loja, em loop, a cada 2.5s. Hook chamado sempre (nunca depois de
  // um "return" condicional - regra dos Hooks do React), a guarda
  // "storeCount < 2" fica dentro do efeito.
  useEffect(() => {
    if (storeCount < 2) return
    const id = setInterval(() => {
      setStoreIndex((i) => (i + 1) % storeCount)
    }, 2500)
    return () => clearInterval(id)
  }, [storeCount])

  if (!product || storeRows.length < 2) return null

  const cheapest = storeRows[0]
  const priciest = storeRows[storeRows.length - 1]
  const savings = priciest.price - cheapest.price
  const verifiedLabel = formatVerifiedLabel(cheapest.lastCheckedAt)

  return (
    // Pedido do Jorge (ronda mais recente): fundo da secção passa a branco
    // puro (era #F7F8F7, um branco-sujo "premium/editorial" escolhido numa
    // ronda anterior) - "o fundo branco que me refiro é o da página".
    // Texto principal #17232B, texto secundário #68747C, verde de marca
    // #123F3A e verde claro dos badges #E8F2EF mantêm-se (o Jorge confirmou
    // manter a cor atual dos botões, não mudar para preto como no mockup
    // mais recente).
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden bg-white py-8 sm:py-10">
      {/* Afinação pedida pelo Jorge: colunas alinhadas pelo topo (era
          "sm:items-center") - a coluna de texto é bem mais baixa do que a
          foto+card, e centradas uma em relação à outra sobrava ~125px de
          vazio em cima do título e outros ~125px abaixo do botão (medido
          ao vivo). Alinhadas pelo topo, o texto fica colado à foto como no
          resto do site. */}
      <div className="relative mx-auto grid max-w-7xl gap-6 px-6 sm:grid-cols-2 sm:items-start sm:gap-8 sm:px-12">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold leading-[1.1] text-[#17232B]">
            A diferença que ninguém te mostra.
          </h2>
          <p className="mt-3 max-w-md text-sm sm:text-base text-[#68747C]">
            Alinhamos o preço do mesmo modelo nas lojas parceiras. A tua poupança é a
            distância entre a primeira e a última linha.
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-3 text-3xl sm:text-4xl font-extrabold text-[#17232B]">
            {formatPrice(cheapest.price)}
            {savings > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F2EF] px-3 py-1 align-middle text-sm font-bold text-[#123F3A]">
                <TagIcon />
                Poupa {formatPrice(savings)}
              </span>
            )}
          </p>
          {/* Era "text-xs" (12px) - subi para "text-sm" (14px): 12px estava
              no limite mínimo de contraste confortável (medido ao vivo,
              4.8:1) e é um texto pequeno demais para ler bem. */}
          <p className="mt-1 text-sm text-[#68747C]">
            {product.model_name}
            {verifiedLabel ? ` · ${verifiedLabel}` : ''}
          </p>
          {/* "min-h-[44px]" adicionado: o botão media só 36px de altura
              (medido ao vivo), abaixo do mínimo recomendado (44px) para um
              alvo de toque confortável no telemóvel. */}
          <Link
            href={`/produto/${product.slug}`}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#123F3A] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
          >
            Ver este par
            <ChevronIcon direction="right" className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="relative">
          {/* Foto fixa (não é mais um carrossel - ver nota no topo do
              ficheiro): "object-cover" é seguro aqui porque é sempre a MESMA
              foto, já enquadrada de propósito (recorte escolhido à mão) para
              o tenis e a prancha ficarem bem visíveis em "aspect-[8/5]" -
              ao contrário do carrossel antigo, que tinha de usar
              "object-contain" para nunca arriscar cortar nenhuma de várias
              fotos imprevisíveis.
              Pedido do Jorge nesta ronda: tirar o card "Onde comprar" de
              cima da foto - deixou de haver sobreposição (a foto já não
              reserva espaço vazio por baixo nem tem "bg-[#EDEFEE]" próprio,
              porque não há nada a esconder por trás do card). */}
          <div className="relative overflow-hidden rounded-[20px] mx-auto w-full max-w-[420px] sm:max-w-none">
            <div className="relative aspect-[8/5] w-full overflow-hidden rounded-[20px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImageSrc}
                // "srcSet"/"sizes": no telemóvel a foto ocupa a largura do
                // ecrã (~420px no máximo) mas antes descarregava sempre a
                // versão de 1600px feita para ecrãs grandes. Com
                // "heroImageSrcMobile" (mesmo recorte, 800px) o browser
                // escolhe sozinho a versão mais leve consoante o ecrã - a
                // foto em si não muda, só o ficheiro servido (pedido do
                // Jorge: "não redesenhar, refinar").
                srcSet={
                  heroImageSrcMobile
                    ? `${heroImageSrcMobile} 800w, ${heroImageSrc} 1600w`
                    : undefined
                }
                sizes={heroImageSrcMobile ? '(min-width: 640px) 50vw, 100vw' : undefined}
                alt={`${product.model_name} - foto lifestyle`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Card "Onde comprar" - fica agora por baixo da foto, sem
              sobreposição (pedido do Jorge, ver nota acima). Sombra/contorno
              mais discretos (era "shadow-sm ring-1 ring-black/5") e raio dos
              cantos igualado ao da foto ("rounded-[20px]", era
              "rounded-2xl") - pedido do Jorge para reduzir a sensação de
              "card dentro de card" sem tirar o contorno por completo (uma
              caixa branca sobre fundo branco precisa de alguma fronteira
              visível, mesmo que ténue). */}
          <div className="relative mt-4 overflow-hidden rounded-[20px] bg-white ring-1 ring-black/[0.06] mx-auto w-full max-w-[420px] sm:max-w-none">
            <div className="flex items-center px-5 pt-2.5 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#68747C]">Onde comprar</span>
            </div>
            {storeRows.map((row, i) => {
              const isBest = i === 0
              const isHighlighted = i === storeIndex
              return (
                <div
                  key={row.store}
                  className={`flex items-center justify-between gap-3 px-5 py-2.5 transition-colors duration-700 ${
                    i > 0 ? 'border-t border-gray-100' : ''
                  } ${isHighlighted ? 'bg-[#E8F2EF]' : ''}`}
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
