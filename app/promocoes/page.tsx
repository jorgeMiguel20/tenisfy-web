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
import PromoGrid, { type PromoItem } from '@/components/PromoGrid'
import { slimForGrid } from '@/lib/slimForGrid'
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

export default async function PromocoesPage() {
  // Só os ténis escolhidos à mão (como até agora) - os importados das lojas
  // afiliadas ficam no catálogo.
  const { products, error } = await getProductsWithPrice({ onlyCurated: true })

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

  // Os dados de cada cartão (preço, preço de referência e a frase que explica
  // a poupança) ficam prontos aqui; os filtros e o desenho das listas estão
  // em components/PromoGrid.tsx.
  const items: PromoItem[] = [
    ...belowOfficial.map((p): PromoItem => {
      const s = p.savings!
      return {
        product: slimForGrid(p),
        section: 'below',
        price: Math.round((s.officialPrice - s.amount) * 100) / 100,
        referencePrice: s.officialPrice,
        note: `Na ${s.store} · ${formatPrice(s.officialPrice)} na ${s.officialStore}`,
      }
    }),
    ...recentDrops.map((p): PromoItem => {
      const d = p.priceDrop!
      const price = p.lowest_price!
      return {
        product: slimForGrid(p),
        section: 'drops',
        price,
        referencePrice: Math.round((price + d.amount) * 100) / 100,
        note: `Desceu ${formatPrice(d.amount)} desde ${formatDay(d.sinceDate)}`,
      }
    }),
  ]

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
          Ténis mais baratos do que na loja oficial da marca ou que desceram de preço nos últimos 14 dias,
          sempre com o preço de referência ao lado.
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

      {!error && !nothing && <PromoGrid items={items} />}
    </main>
  )
}
