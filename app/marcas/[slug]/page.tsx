// app/marcas/[slug]/page.tsx
//
// Página de cada marca (ex.: /marcas/nike) - feita para o Google: título e
// texto próprios para pesquisas como "ténis Nike preço", com a lista de
// ténis dessa marca e o preço mais baixo de cada um. Dados sempre reais
// (os mesmos do catálogo), nunca inventados.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import { supabase } from '@/lib/supabase'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'
import { formatPrice } from '@/lib/formatPrice'
import { SITE_URL } from '@/lib/siteUrl'
import { getBrandIntro, BRAND_PAGE_FOOTNOTE } from '@/lib/brandContent'

export const revalidate = 3600 // ISR: 1 hora, como o resto do catálogo

type Brand = { id: string; name: string; slug: string }

export async function generateStaticParams() {
  const { data } = await supabase.from('brands').select('slug')
  return (data ?? []).map((brand) => ({ slug: brand.slug }))
}

async function getBrandPageData(slug: string) {
  const { data: brand } = await supabase.from('brands').select('id, name, slug').eq('slug', slug).maybeSingle()
  if (!brand) return null

  const { products, error } = await getProductsWithPrice()
  const brandProducts = error
    ? []
    : products
        .filter((product) => product.brand_id === (brand as Brand).id)
        .sort((a, b) => {
          // Com stock primeiro, depois do mais barato para o mais caro.
          if (a.lowest_price == null) return 1
          if (b.lowest_price == null) return -1
          return a.lowest_price - b.lowest_price
        })

  const prices = brandProducts.map((p) => p.lowest_price).filter((price): price is number => price != null)
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null

  return { brand: brand as Brand, products: brandProducts, lowestPrice }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await getBrandPageData(slug)
  if (!data) return { title: 'Marca não encontrada | Parjusto' }

  const { brand, products, lowestPrice } = data
  const count = products.length
  const title = `Ténis ${brand.name}: compara preços em Portugal | Parjusto`
  const description = count
    ? `Compara o preço de ${count} modelo${count !== 1 ? 's' : ''} ${brand.name} nas lojas portuguesas${
        lowestPrice ? `, desde ${formatPrice(lowestPrice)}` : ''
      }. Preços e stock verificados todos os dias.`
    : `Ténis ${brand.name} nas lojas portuguesas. Preços e stock verificados todos os dias no Parjusto.`

  return {
    title,
    description,
    alternates: { canonical: `/marcas/${brand.slug}` },
    // Marca sem nenhum ténis à venda: a página existe, mas não interessa
    // ao Google (seria uma página vazia).
    ...(count === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description },
  }
}

const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'

export default async function MarcaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getBrandPageData(slug)
  if (!data) notFound()

  const { brand, products, lowestPrice } = data
  const pageUrl = `${SITE_URL}/marcas/${brand.slug}`
  const storeCount = new Set(
    products.flatMap((p) => (p.product_offers ?? []).filter((o) => o.in_stock).map((o) => o.store_id))
  ).size

  // Dados estruturados para o Google: percurso (Parjusto > Marcas > Nike)
  // e a lista de ténis desta página.
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Parjusto', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Marcas', item: `${SITE_URL}/marcas` },
        { '@type': 'ListItem', position: 3, name: brand.name, item: pageUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Ténis ${brand.name}`,
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/produto/${product.slug}`,
        name: `${brand.name} ${product.model_name}`,
      })),
    },
  ]

  return (
    <main className="w-full pb-20 pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="px-6">
        <nav className="text-[13px] text-[#5C6770]">
          <Link href="/" className="transition-colors hover:text-[#17232B]">
            Parjusto
          </Link>
          <span className="mx-1.5">/</span>
          <Link href="/marcas" className="transition-colors hover:text-[#17232B]">
            Marcas
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-[#17232B]">{brand.name}</span>
        </nav>

        <header className="mt-6 max-w-2xl">
          <p className={LABEL}>Marca</p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B] sm:text-[44px]">
            Ténis {brand.name}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#5C6770]">{getBrandIntro(brand.slug, brand.name)}</p>
          {products.length > 0 && (
            <p className="mt-4 text-sm text-[#17232B]">
              {products.length} modelo{products.length !== 1 ? 's' : ''}
              {lowestPrice ? ` · desde ${formatPrice(lowestPrice)}` : ''}
              {storeCount > 0 ? ` · em ${storeCount} loja${storeCount !== 1 ? 's' : ''}` : ''}
            </p>
          )}
        </header>
      </div>

      {products.length === 0 ? (
        <div className="mt-10 px-6">
          <p className="text-[#5C6770]">Neste momento não temos ténis {brand.name} no catálogo.</p>
          <Link
            href="/catalogo"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#17232B] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#17232B]/85"
          >
            Ver o catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 border-l border-t border-[#17232B]/10 sm:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} inGrid />
          ))}
        </div>
      )}

      <p className="mt-10 max-w-2xl px-6 text-sm leading-relaxed text-[#5C6770]">{BRAND_PAGE_FOOTNOTE}</p>
    </main>
  )
}
