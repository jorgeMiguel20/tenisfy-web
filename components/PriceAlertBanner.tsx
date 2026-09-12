'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import PriceAlertButton from './PriceAlertButton'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'

// Redesign pedido pelo Jorge (feito primeiro no Claude Design, aqui adaptado
// ao componente real): passa de bloco escuro para um cartao claro e
// profissional, com a funcionalidade de "preco alvo" explicada por uma
// pequena animacao em loop de 3 passos, em vez de texto solto. O botao
// "Criar alerta gratis" continua a ser o PriceAlertButton real (mesma logica
// de sempre) - a animacao a direita e so uma demonstracao visual do
// conceito, por isso o "preco alvo" que aparece nela e um exemplo ilustrativo
// (~10% abaixo do preco atual), nunca um valor inventado apresentado como
// real.
function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

export default function PriceAlertBanner({ product }: { product: ProductWithPrice | null }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 3), 3200)
    return () => clearInterval(interval)
  }, [])

  if (!product || product.lowest_price == null) return null

  const image = product.image_url ?? product.image_urls?.[0] ?? null
  const current = product.lowest_price
  const target = Math.max(1, Math.round(current * 0.9 * 100) / 100)
  const brand = product.brands?.name ?? ''

  return (
    <section className="mb-12">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
        <div className="grid items-center gap-10 sm:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-900" />
              Alerta de preço inteligente
            </span>
            <h2 className="font-display mt-4 text-3xl font-bold leading-tight sm:text-4xl">
              <span className="text-gray-900">Tu defines o preço.</span>
              <br />
              <span className="text-gray-400">Nós avisamos quando descer.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm text-gray-600">
              Define o teu preço limite para qualquer ténis do catálogo e recebe um email
              automático assim que uma loja parceira atingir o valor que pretendes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700">
                100% grátis, sem conta paga
              </span>
              <span className="rounded-full bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700">
                24/7 lojas parceiras monitorizadas
              </span>
            </div>
            <div className="mt-7">
              <PriceAlertButton productId={product.id} currentPrice={product.lowest_price} variant="large" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
            <div className="relative h-[300px] sm:h-[280px]">
              {/* Passo 1: escolher o preco alvo (exemplo ilustrativo, nao um valor real gravado) */}
              <div
                className="absolute inset-0 p-6 transition-opacity duration-700"
                style={{ opacity: step === 0 ? 1 : 0 }}
                aria-hidden={step !== 0}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50">
                    {image && (
                      <Image src={image} alt={product.model_name} fill sizes="56px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {brand}
                    </p>
                    <p className="truncate text-sm font-semibold text-gray-900">{product.model_name}</p>
                    <p className="text-xs text-gray-500">Preço atual {formatPrice(current)}</p>
                  </div>
                </div>
                <p className="mt-5 text-xs font-medium text-gray-500">Avisar-me abaixo de</p>
                <div className="mt-1 rounded-xl border border-gray-200 px-4 py-3 text-2xl font-bold text-gray-900">
                  {formatPrice(target)}
                </div>
                <div className="relative mt-4 h-1.5 rounded-full bg-gray-100">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gray-900" style={{ width: '75%' }} />
                  <div
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-gray-900 bg-white"
                    style={{ left: 'calc(75% - 7px)' }}
                  />
                </div>
              </div>

              {/* Passo 2: alerta ativado */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center transition-opacity duration-700"
                style={{ opacity: step === 1 ? 1 : 0 }}
                aria-hidden={step !== 1}
              >
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50 text-yellow-500">
                  <BellIcon className="h-5 w-5" />
                </span>
                <p className="text-lg font-bold text-gray-900">Alerta ativado!</p>
                <p className="mt-2 max-w-[240px] text-xs text-gray-500">
                  Vamos monitorizar o {brand} {product.model_name} nas lojas parceiras e avisar-te abaixo de{' '}
                  {formatPrice(target)}.
                </p>
                <span className="mt-3 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-600">
                  A monitorizar 24/7
                </span>
              </div>

              {/* Passo 3: exemplo do email que chega quando o preco desce */}
              <div
                className="absolute inset-0 p-6 transition-opacity duration-700"
                style={{ opacity: step === 2 ? 1 : 0 }}
                aria-hidden={step !== 2}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Novo email</p>
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
                    <BellIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">
                      Preço desceu para {formatPrice(target)}!
                    </p>
                    <p className="text-[11px] text-gray-400">alertas@parjusto.pt · agora</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-600">
                  O {brand} {product.model_name} atingiu o teu preço alvo numa loja parceira.
                </p>
                <p className="mt-3 text-xl font-bold text-gray-900">
                  {formatPrice(target)}{' '}
                  <span className="text-sm font-normal text-gray-400 line-through">{formatPrice(current)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 pb-5">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${i === step ? 'bg-gray-900' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-gray-400">Sem spam. Cancela o alerta num clique.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
