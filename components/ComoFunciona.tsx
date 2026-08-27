// components/ComoFunciona.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'

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

export default function ComoFunciona() {
  const [active, setActive] = useState(0)

  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
        Como funciona o Parjusto
      </h2>
      <p className="text-center text-sm text-gray-500 mb-8">Desliza pelos 3 passos</p>

      <div className="grid sm:grid-cols-2 rounded-2xl overflow-hidden shadow-lg mb-4">
        <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[280px]">
          <Image src={STEPS[active].image} alt={STEPS[active].title} fill className="object-cover" />
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
