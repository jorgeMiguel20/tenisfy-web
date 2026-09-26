// app/promocoes/page.tsx
// Página "Promoções" (link do menu). Antes o menu saltava para a secção
// "Maior poupança agora" da homepage; quando essa secção estava vazia, o
// link levava só ao topo da homepage e parecia não fazer nada (pedido do
// Jorge). Agora é uma página própria, com duas listas de dados reais:
//
// 1. Abaixo do preço oficial - o preço mais barato numa loja parceira vs
//    o preço na loja oficial da marca, para o mesmo modelo (ver
//    lib/savings.ts). Sem loja oficial com stock = o ténis não entra.
// 2. Desceram nos últimos 14 dias - melhor preço de hoje vs o primeiro dia
//    registado nos últimos 14 dias (ver lib/priceDrop.ts).
//
// Se as duas estiverem vazias, a página diz isso claramente e sugere o
// catálogo e os alertas de preço - nunca fica em branco.
import type { Metadata } from 'next'
import Link from 'next/link'
import PromoCard from '@/components/PromoCard'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'
import { formatPrice } from '@/lib/formatPrice'
import { formatDay } from '@/lib/formatDay'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Promoções de ténis — abaixo do preço oficial | Parjusto',
  description:
    'Ténis Nike, adidas, New Balance e mais abaixo do preço oficial da marca e com descidas de preço recentes, em lojas portuguesas. Preços verificados.',
  alternates: { canonical: '/promocoes' },
}

const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'
const H2 = 'font-display text-2xl font-bold tracking-[-0.01em] text-[#17232B] sm:text-[28px]'
const GRID = 'mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4'

export default async function PromocoesPage() {
  const { products, error } = await getProductsWithPrice()

  const belowOfficial = error
    ? []
    : products
        .filter((p) => p.savings && p.lowest_price != null)
        .sort((a, b) => b.savings!.amount / b.savings!.officialPrice - a.savings!.amount / a.savings!.officialPrice)

  const recentDrops = error
    ? []
    : products
        .filter((p) => p.priceDrop && p.lowest_price != null)
        .sort((a, b) => b.priceDrop!.amount - a.priceDrop!.amount)

  const nothing = belowOfficial.length === 0 && recentDrops.length === 0

  return (
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-10">
      <nav className="text-[13px] text-[#5C6770]">
        <Link href="/" className="transition-colors hover:text-[#17232B]">
          Parjusto
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#17232B]">Promoções</span>
      </nav>

      <header className="mt-6 max-w-2xl">
        <p className={LABEL}>Promoções</p>
        <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B] sm:text-[44px]">
          Promoções de ténis
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[#5C6770]">
          Ténis abaixo do preço oficial da marca e descidas de preço dos últimos 14 dias, nas lojas
          parceiras. Mostramos sempre com o quê estamos a comparar.
        </p>
      </header>

      {error && (
        <p className="mt-10 text-[#5C6770]">Não foi possível carregar as promoções. Tenta outra vez daqui a pouco.</p>
      )}

      {!error && nothing && (
        <section className="mt-12 border-t border-[#17232B]/10 pt-10">
          <h2 className={H2}>Hoje não há promoções.</h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[#5C6770]">
            Nenhum ténis está abaixo do preço oficial da marca e nenhum desceu de preço nos últimos 14
            dias. Cria um alerta de preço num modelo que te interesse e avisamos-te quando descer.
          </p>
          <Link
            href="/catalogo"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#123F3A] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
          >
            Ver catálogo
          </Link>
        </section>
      )}

      {belowOfficial.length > 0 && (
        <section className="mt-12 border-t border-[#17232B]/10 pt-10">
          <h2 className={H2}>Abaixo do preço oficial</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#5C6770]">
            O preço mais baixo nas lojas parceiras, comparado com o preço na loja oficial da marca para o
            mesmo modelo.
          </p>
          <div className={GRID}>
            {belowOfficial.map((p) => {
              const s = p.savings!
              return (
                <PromoCard
                  key={p.id}
                  slug={p.slug}
                  imageUrl={p.image_url}
                  brandName={p.brands?.name}
                  modelName={p.model_name}
                  price={Math.round((s.officialPrice - s.amount) * 100) / 100}
                  referencePrice={s.officialPrice}
                  note={`Na ${s.store} · ${formatPrice(s.officialPrice)} na ${s.officialStore}`}
                />
              )
            })}
          </div>
        </section>
      )}

      {recentDrops.length > 0 && (
        <section className="mt-12 border-t border-[#17232B]/10 pt-10">
          <h2 className={H2}>Desceram nos últimos 14 dias</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#5C6770]">
            O melhor preço de hoje, comparado com o melhor preço registado há até 14 dias.
          </p>
          <div className={GRID}>
            {recentDrops.map((p) => {
              const d = p.priceDrop!
              const price = p.lowest_price!
              return (
                <PromoCard
                  key={p.id}
                  slug={p.slug}
                  imageUrl={p.image_url}
                  brandName={p.brands?.name}
                  modelName={p.model_name}
                  price={price}
                  referencePrice={Math.round((price + d.amount) * 100) / 100}
                  note={`Desceu ${formatPrice(d.amount)} desde ${formatDay(d.sinceDate)}`}
                />
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
