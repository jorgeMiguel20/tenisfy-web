// components/PriceAlertButton.tsx
'use client'

import { useEffect, useId, useState, useSyncExternalStore, type FormEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { createPriceAlert } from '@/app/produto/[slug]/priceAlertActions'
import { formatPrice } from '@/lib/formatPrice'

function BellIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

// Só um modal de "Avisa-me quando descer" pode estar aberto de cada vez em
// toda a página (as grelhas têm muitos cards, cada um com o seu próprio
// botão) - store module-level simples fora do React, mais leve do que um
// Context a atravessar todas as grelhas/páginas que usam este botão.
let activeAlertId: string | null = null
const listeners = new Set<() => void>()

function setActiveAlert(id: string | null) {
  activeAlertId = id
  listeners.forEach((listener) => listener())
}

function subscribeActiveAlert(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Versão compacta do "Avisa-me quando o preço descer" (ver PriceAlertForm.tsx,
// na página do produto) para usar em cima dos cards da grelha/catálogo/
// favoritos. Fica fechado por defeito (só o sino) e abre um modal centrado
// com fundo escurecido, via portal para <body> - assim bloqueia mesmo o
// resto da página (incl. os cards vizinhos, que são <Link>) até o
// utilizador terminar ou cancelar, e nunca há mais que um aberto.
export default function PriceAlertButton({
  productId,
  currentPrice,
  className = '',
  variant = 'compact',
  imageUrl = null,
  brandName = '',
  modelName = '',
  label = 'Criar alerta grátis',
}: {
  productId: string
  currentPrice: number | null
  className?: string
  variant?: 'compact' | 'large'
  imageUrl?: string | null
  brandName?: string
  modelName?: string
  // Texto do botão grande (variant "large").
  label?: string
}) {
  const id = useId()
  const activeId = useSyncExternalStore(subscribeActiveAlert, () => activeAlertId, () => null)
  const open = activeId === id

  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  // Slider do "Valor máximo desejado": intervalo entre metade e ~99% do
  // preço atual, para o utilizador sempre poder escolher um valor abaixo do
  // preço de hoje (não faria sentido um alerta igual ou acima do preço
  // atual). Sem preço atual (raro - produto sem oferta), usa um intervalo
  // genérico.
  const sliderMin = currentPrice != null ? Math.max(1, Math.round(currentPrice * 0.5)) : 1
  const sliderMax = currentPrice != null ? Math.max(sliderMin + 1, Math.round(currentPrice * 0.99)) : 100
  const [targetPrice, setTargetPrice] = useState(() =>
    currentPrice != null ? Math.max(1, Math.round(currentPrice * 0.9)) : 50
  )
  // Campo de texto para o utilizador poder escrever o valor diretamente,
  // além de arrastar o slider (pedido do Jorge: "quero que exista também a
  // funcionalidade do utilizador poder escrever manualmente"). Guarda-se o
  // texto em bruto à parte do valor numérico para o utilizador poder
  // apagar/editar livremente enquanto escreve - só valida e sincroniza com
  // targetPrice (e por isso com o slider, que usa o mesmo estado) quando o
  // campo perde o foco ou o utilizador prime Enter.
  const [targetPriceInput, setTargetPriceInput] = useState(() => String(targetPrice))

  useEffect(() => {
    setTargetPriceInput(String(targetPrice))
  }, [targetPrice])

  // Ao contrário do slider (que fica preso entre sliderMin e sliderMax, para
  // arrastar sempre dar um valor abaixo do preço atual), o campo de texto
  // deixa o utilizador escrever o valor mínimo que quiser - pedido do Jorge,
  // sem limite inferior imposto. Só se valida que é mesmo um número positivo.
  function commitManualPrice() {
    const parsed = Number(targetPriceInput.replace(',', '.'))
    if (Number.isFinite(parsed) && parsed > 0) {
      setTargetPrice(Math.round(parsed))
    } else {
      setTargetPriceInput(String(targetPrice))
    }
  }

  const sliderPercent = Math.min(100, Math.max(0, Math.round(((targetPrice - sliderMin) / (sliderMax - sliderMin)) * 100)))
  // "Expiração": ao fim de 1 ou 2 meses o alerta é eliminado automaticamente
  // (ver app/produto/[slug]/priceAlertActions.ts e o cron diário que faz a
  // limpeza). Pedido do Jorge: mesmo estilo preto/branco do resto do site,
  // nunca a cor azul/turquesa do mockup original dele.
  const [durationMonths, setDurationMonths] = useState<1 | 2>(1)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveAlert(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  function stopNav(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function close(e?: MouseEvent) {
    if (e) stopNav(e)
    setActiveAlert(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setStatus('loading')

    const result = await createPriceAlert(productId, email, targetPrice, durationMonths)

    if (result.success) {
      setStatus('done')
      setMessage(
        result.alreadyConfirmed
          ? 'Alerta atualizado - já estava confirmado.'
          : 'Enviámos um e-mail de confirmação.'
      )
    } else {
      setStatus('error')
      setMessage(result.error)
    }
  }

  const hasHeaderInfo = Boolean(modelName || imageUrl)

  return (
    // inline-block (em vez de block, que ocupava a largura toda do
    // container): o botão fica só com a largura do próprio texto.
    <div className={`relative inline-block ${className}`}>
      {/* variant "large" (usado no PriceAlertBanner.tsx da homepage) mostra
          um botao cheio com texto, em vez do circulo pequeno so com o sino
          usado nos cards do catalogo - a logica do alerta em si (modal,
          submissao) e sempre a mesma, so muda o aspeto do botao. */}
      {/* Botão grande: retângulo verde da marca, como os outros botões
          principais da homepage ("Ver este par", "Ir para o comparador"),
          sem anel a pulsar nem seta a simular um toque - esses efeitos
          davam ao botão o ar de modelo genérico que se quis tirar do site
          (pedido do Jorge: "não pode parecer que foi criado com IA"). */}
      <button
        type="button"
        onClick={(e) => {
          stopNav(e)
          setActiveAlert(open ? null : id)
        }}
        aria-pressed={open}
        aria-label="Avisa-me quando o preço descer"
        className={
          variant === 'large'
            ? `relative inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-none px-5 text-sm font-semibold transition-colors ${
                open ? 'bg-[#0d2f2b] text-white' : 'bg-[#123F3A] text-white hover:bg-[#0d2f2b]'
              }`
            : `inline-flex items-center justify-center rounded-full shadow-sm p-2 transition-colors ${
                open ? 'bg-gray-900' : 'bg-white/90 hover:bg-white'
              }`
        }
      >
        <BellIcon
          className={`h-4 w-4 ${variant === 'large' || open ? 'text-white' : 'text-gray-400'}`}
        />
        {variant === 'large' && label}
      </button>

      {/* Estilo do slider de "Valor máximo desejado" - input nativo type=range
          com aparencia customizada (faixa preenchida a preto ate ao ponto
          escolhido, pega branca com contorno preto), para bater certo com o
          resto do modal. Fica sempre disponivel (nao depende da variante),
          por isso e um bloco de estilo aparte do de cima. */}
      <style>{`
        .price-alert-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(to right, #111827 0%, #111827 var(--slider-percent), #f3f4f6 var(--slider-percent), #f3f4f6 100%);
          outline: none;
        }
        .price-alert-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #fff;
          border: 2px solid #111827;
          cursor: pointer;
        }
        .price-alert-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #fff;
          border: 2px solid #111827;
          cursor: pointer;
        }
        .price-alert-slider::-moz-range-track {
          height: 6px;
          border-radius: 999px;
          background: transparent;
        }
      `}</style>

      {mounted && open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          {/* Janela com cantos retos e sem sombra (o fundo escurecido já a
              separa da página) - mesmas regras visuais do resto do site. */}
          <div onClick={stopNav} className="w-full max-w-sm rounded-none bg-white p-5">
            {/* Cabeçalho com o produto (foto/marca/nome/preço atual) - pedido
                do Jorge para o modal deixar claro para que ténis é o alerta,
                em vez de aparecer "às cegas". */}
            {hasHeaderInfo && (
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-none bg-[#F9FBFC]">
                  {imageUrl && (
                    <Image src={imageUrl} alt={modelName} fill sizes="48px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {brandName}
                  </p>
                  <p className="truncate text-sm font-semibold text-gray-900">{modelName}</p>
                  {currentPrice != null && (
                    <p className="text-xs text-gray-500">Preço atual {formatPrice(currentPrice)}</p>
                  )}
                </div>
              </div>
            )}

            {status === 'done' ? (
              <>
                <p className={`text-sm text-green-700 ${hasHeaderInfo ? 'mt-4' : ''}`}>{message}</p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-none bg-[#123F3A] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
                >
                  Fechar
                </button>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col">
                {/* Valor máximo desejado - preço centrado, com slider por
                    baixo. O valor também pode ser escrito diretamente no
                    campo (pedido do Jorge) - o slider e o campo de texto
                    partilham o mesmo estado (targetPrice), por isso ficam
                    sempre sincronizados um com o outro. */}
                <div className="border-b border-gray-100 py-4 text-center">
                  <p className="text-xs font-semibold text-gray-900">Valor máximo desejado</p>
                  {/* O contorno agora está só à volta do campo do número (não
                      do bloco "abaixo de ... €" todo) - pedido do Jorge:
                      antes o contorno envolvia tudo, dando a ideia de que se
                      podia clicar em qualquer parte para escrever, quando só
                      o número reagia. Assim fica visualmente claro que só
                      ali é editável. */}
                  <div className="mt-2 inline-flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900">abaixo de</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={targetPriceInput}
                      onChange={(e) => setTargetPriceInput(e.target.value)}
                      onBlur={commitManualPrice}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          commitManualPrice()
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-14 rounded-none border border-gray-300 bg-white px-1.5 py-1 text-sm font-bold text-gray-900 text-center focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      aria-label="Valor máximo desejado, em euros"
                    />
                    <span className="text-sm font-bold text-gray-900">€</span>
                  </div>
                  <input
                    type="range"
                    min={sliderMin}
                    max={sliderMax}
                    step={1}
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(Number(e.target.value))}
                    className="price-alert-slider mt-3"
                    style={{ ['--slider-percent' as string]: `${sliderPercent}%` }}
                    aria-label="Valor máximo desejado"
                  />
                </div>

                {/* Expiração - elimina o alerta ao fim de 1 ou 2 meses (ver
                    priceAlertActions.ts). Mesmo estilo preto/branco de
                    seleção do resto do site - sem a cor azul/turquesa do
                    mockup original do Jorge, pedido explícito dele. */}
                <div className="border-b border-gray-100 py-4">
                  <p className="text-xs font-semibold text-gray-900">Expiração</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Após o período especificado, o alerta será eliminado.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDurationMonths(1)}
                      className={`flex-1 rounded-none border px-3 py-2 text-xs font-semibold transition-colors ${
                        durationMonths === 1
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-900'
                      }`}
                    >
                      1 mês
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationMonths(2)}
                      className={`flex-1 rounded-none border px-3 py-2 text-xs font-semibold transition-colors ${
                        durationMonths === 2
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-900'
                      }`}
                    >
                      2 meses
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-xs font-semibold text-gray-900">Endereço de e-mail</p>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="o-teu-email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-none border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#17232B]"
                  />
                </div>

                {status === 'error' && <p className="mt-2 text-xs text-red-600">{message}</p>}

                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="inline-flex min-h-[44px] items-center rounded-none bg-[#123F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b] disabled:opacity-50"
                  >
                    {status === 'loading' ? 'A criar...' : 'Criar alerta'}
                  </button>
                  <button type="button" onClick={close} className="text-sm text-[#5C6770] hover:text-[#17232B]">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
