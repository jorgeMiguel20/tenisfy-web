// components/DiferencaPrecos.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'

// Seccao "A diferenca que ninguem te mostra" - redesign confirmado pelo
// Jorge a partir do Claude Design (Parjusto - seccao 1d). Mostra o preco do
// mesmo produto em ate 4 lojas reais, do mais caro ao mais barato, com um
// pequeno carrossel automatico que percorre as linhas - nunca lojas ou
// precos inventados, so ofertas reais em stock do produto recebido.
//
// Paleta clara (fundo creme, igual ao resto do site) em vez do fundo escuro
// da versao anterior - pedido explicito do Jorge. A linha destacada da
// lista usa preto solido (nao laranja) e "poupas X€" fica a verde.
//
// Mesma logica de bestPricePerStore/formatVerifiedLabel de ComoFunciona.tsx,
// duplicada aqui de proposito (secao independente, para nao arriscar mexer
// no componente existente).
function bestPricePerStore(product: ProductWithPrice) {
const grouped = new Map<string, { price: number; oldestCheckedAt: string | null }>()
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
})
}
// Do mais caro para o mais barato - o carrossel termina sempre na loja
// mais barata, tal como no design original.
return Array.from(grouped.entries())
.map(([store, { price, oldestCheckedAt }]) => ({ store, price, lastCheckedAt: oldestCheckedAt }))
.sort((a, b) => b.price - a.price)
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

export default function DiferencaPrecos({ product }: { product?: ProductWithPrice | null }) {
const storeRows = product ? bestPricePerStore(product).slice(0, 4) : []
const [active, setActive] = useState(0)

useEffect(() => {
if (storeRows.length < 2) return
const id = setInterval(() => {
setActive((i) => (i + 1) % storeRows.length)
}, 2200)
return () => clearInterval(id)
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [storeRows.length])

if (!product || storeRows.length < 2) return null

const maxPrice = Math.max(...storeRows.map((r) => r.price))
const activeRow = storeRows[active]
const savings = maxPrice - activeRow.price
const verifiedLabel = formatVerifiedLabel(activeRow.lastCheckedAt)

return (
<section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden bg-[#EFEBE2] py-16 sm:py-20">
<div className="relative mx-auto grid max-w-7xl gap-14 px-6 sm:grid-cols-2 sm:items-center sm:gap-16 sm:px-12">
<div>
<span className="text-xs font-bold uppercase tracking-wide text-orange-500">
O mesmo ténis, {COUNT_WORDS[storeRows.length] ?? storeRows.length} preços
</span>
<h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold leading-tight text-gray-900">
A diferença que ninguém te mostra.
</h2>
<p className="mt-4 max-w-sm text-sm text-gray-600">
Alinhamos o preço do mesmo modelo nas lojas parceiras. A tua poupança é a
distância entre a primeira e a última linha.
</p>
<p className="mt-6 text-4xl sm:text-5xl font-extrabold text-gray-900">
{formatPrice(activeRow.price)}
{savings > 0 && (
<span className="ml-3 align-middle text-base font-bold text-emerald-600">
poupas {formatPrice(savings)}
</span>
)}
</p>
<p className="mt-2 text-xs text-gray-500">
{product.model_name}
{verifiedLabel ? ` · ${verifiedLabel}` : ''}
</p>
<Link
href={`/produto/${product.slug}`}
className="mt-6 inline-flex items-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
>
Ver este par
</Link>
</div>

<div className="relative">
{product.image_url ? (
<div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={product.image_url}
alt={product.model_name}
loading="lazy"
className="h-full w-full object-contain"
/>
</div>
) : null}

<div
className={`overflow-hidden rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-black/5 ${
product.image_url
? 'mt-6 w-full sm:absolute sm:mt-0 sm:bottom-0 sm:-left-6 sm:w-[80%] sm:max-w-sm'
: ''
}`}
>
{storeRows.map((row, i) => (
<div
key={row.store}
className={`flex items-center justify-between gap-3 px-3.5 py-3.5 transition-colors ${
i === active ? 'rounded-lg bg-gray-900' : ''
} ${i > 0 && i !== active && i - 1 !== active ? 'border-t border-gray-100' : ''}`}
>
<span className="flex items-center gap-3">
<span className={`text-xs font-bold ${i === active ? 'text-white/50' : 'text-gray-400'}`}>
{String(i + 1).padStart(2, '0')}
</span>
<span className={`text-sm ${i === active ? 'font-bold text-white' : 'text-gray-600'}`}>
{row.store}
</span>
</span>
<span className={`text-sm ${i === active ? 'font-extrabold text-white' : 'text-gray-400'}`}>
{formatPrice(row.price)}
</span>
</div>
))}
</div>
</div>
</div>
</section>
)
}
