// components/ComoFunciona.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'

const STEPS = [
  {
    title: 'Pesquisa por texto ou por foto',
    text: 'Escreve o modelo que procuras ou tira uma foto — os dois caminhos levam ao mesmo catálogo, que cresce todas as semanas com o que está mesmo à venda nas lojas.',
    image: '/marketing/step-search.jpg',
  },
  {
    title: 'Compara lojas',
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
function bestPricePerStore(product: ProductWithPrice) {
  const grouped = new Map<string, number>()
  for (const offer of product.product_offers ?? []) {
    if (!offer.in_stock || !offer.stores) continue
    const current = grouped.get(offer.stores.name)
    if (current == null || offer.price < current) grouped.set(offer.stores.name, offer.price)
  }
  return Array.from(grouped.entries())
    .map(([store, price]) => ({ store, price }))
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

  const storeRows = showcaseProduct ? bestPricePerStore(showcaseProduct) : []
  const hasCompareData = storeRows.length >= 2
  const hasBuyData = !!showcaseProduct?.lowest_price && !!showcaseProduct?.savings

  return (
    <section className={hasNextSection ? 'mb-12' : ''}>
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
        <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[280px] bg-gray-50">
          {active === 0 && (
            <div className="relative h-full w-full">
              <Image src={STEPS[0].image} alt={STEPS[0].title} fill className="object-cover" />
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
              <div className="flex h-full w-full items-center p-4 sm:p-6">
                <div className="w-full divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100 bg-white">
                  {storeRows.slice(0, 4).map((row, i) => (
                    <div
                      key={row.store}
                      className={`flex items-center justify-between gap-3 px-4 py-3 ${i === 0 ? 'bg-orange-50' : ''}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900">{row.store}</span>
                        {i === 0 && (
                          <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                            Melhor preço
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-gray-900">{formatPrice(row.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Image src={STEPS[1].image} alt={STEPS[1].title} fill className="object-cover" />
            ))}

          {active === 2 &&
            (hasBuyData ? (
              <div className="flex h-full w-full items-center gap-4 p-4 sm:p-6">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50 sm:h-24 sm:w-24">
                  {showcaseProduct!.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={showcaseProduct!.image_url}
                      alt={showcaseProduct!.model_name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {showcaseProduct!.brands?.name}
                  </p>
                  <p className="truncate font-semibold text-gray-900">{showcaseProduct!.model_name}</p>
                  <p className="mt-1 text-xl font-extrabold text-orange-600">
                    {formatPrice(showcaseProduct!.lowest_price!)}
                  </p>
                  <span className="mt-1.5 inline-block rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                    Poupa {formatPrice(showcaseProduct!.savings!.amount)} escolhendo {showcaseProduct!.savings!.store}
                  </span>
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
