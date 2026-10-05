// app/marcas/page.tsx
//
// Lista de marcas (link "Marcas" do menu). Cada marca leva à sua página
// própria (/marcas/[slug]), feita para aparecer no Google em pesquisas como
// "ténis Nike preço".
import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'
import { formatPrice } from '@/lib/formatPrice'
import { SITE_URL } from '@/lib/siteUrl'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Marcas de ténis: Nike, adidas, New Balance e mais | Parjusto',
  description:
    'Escolhe a marca e compara o preço dos ténis Nike, adidas, New Balance, Asics e Vans nas lojas portuguesas. Preços e stock verificados todos os dias.',
  alternates: { canonical: '/marcas' },
}

const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'

type BrandRow = { id: string; name: string; slug: string }

export default async function MarcasPage() {
  const [{ data: brandRows }, { products }] = await Promise.all([
    supabase.from('brands').select('id, name, slug').order('name'),
    getProductsWithPrice(),
  ])

  const brands = ((brandRows ?? []) as BrandRow[])
    .map((brand) => {
      const brandProducts = products.filter((p) => p.brand_id === brand.id)
      const prices = brandProducts.map((p) => p.lowest_price).filter((price): price is number => price != null)
      const cover = brandProducts.find((p) => p.image_url)?.image_url ?? null
      return {
        ...brand,
        count: brandProducts.length,
        lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
        cover,
      }
    })
    .filter((brand) => brand.count > 0)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Parjusto', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Marcas', item: `${SITE_URL}/marcas` },
    ],
  }

  return (
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <nav className="text-[13px] text-[#5C6770]">
        <Link href="/" className="transition-colors hover:text-[#17232B]">
          Parjusto
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#17232B]">Marcas</span>
      </nav>

      <header className="mt-6 max-w-2xl">
        <p className={LABEL}>Marcas</p>
        <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B] sm:text-[44px]">
          Marcas de ténis
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#5C6770]">
          Escolhe a marca e compara o preço de cada modelo nas lojas portuguesas, com os portes de envio incluídos
          nas contas.
        </p>
      </header>

      <ul className="mt-10 grid grid-cols-2 border-l border-t border-[#17232B]/10 sm:grid-cols-3 lg:grid-cols-5">
        {brands.map((brand) => (
          <li key={brand.id} className="border-b border-r border-[#17232B]/10 bg-white">
            <Link href={`/marcas/${brand.slug}`} className="group flex h-full flex-col p-4">
              <div className="aspect-square w-full overflow-hidden bg-[#F5F4F0]">
                {brand.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brand.cover}
                    alt={`Ténis ${brand.name}`}
                    loading="lazy"
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <p className="mt-4 text-lg font-semibold text-[#17232B]">{brand.name}</p>
              <p className="mt-1 text-sm text-[#5C6770]">
                {brand.count} modelo{brand.count !== 1 ? 's' : ''}
                {brand.lowestPrice ? ` · desde ${formatPrice(brand.lowestPrice)}` : ''}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
