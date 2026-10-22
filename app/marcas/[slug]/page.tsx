// app/marcas/[slug]/page.tsx
//
// Página de cada marca (ex.: /marcas/nike): só o nome da marca, o total de
// ténis e os filtros do catálogo (sem o filtro "Marca", que já está
// escolhida). O título e a descrição para o Google continuam próprios
// ("Ténis Nike: compara preços em Portugal"). Dados sempre reais (os mesmos
// do catálogo), nunca inventados.
import { Suspense, cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductGrid from '@/components/ProductGrid'
import BackToTopButton from '@/components/BackToTopButton'
import { supabase } from '@/lib/supabase'
import { getProductsWithPrice } from '@/lib/getProductsWithPrice'
import { slimForGrid } from '@/lib/slimForGrid'
import { formatPrice } from '@/lib/formatPrice'
import { SITE_URL } from '@/lib/siteUrl'

export const revalidate = 3600 // ISR: 1 hora, como o resto do catálogo

type Brand = { id: string; name: string; slug: string }

// Na publicação do site só se preparam as páginas das marcas dos ténis
// escolhidos à mão. As centenas de marcas que chegam com a importação
// automática ficam prontas na primeira visita (e depois guardadas 1 hora,
// como as outras) - assim a publicação continua rápida.
export async function generateStaticParams() {
  const { data } = await supabase.from('brands').select('slug, products!inner (id)').is('products.source', null)
  const slugs = new Set(((data ?? []) as { slug: string }[]).map((brand) => brand.slug))
  return Array.from(slugs).map((slug) => ({ slug }))
}

// cache(): o título da página (generateMetadata) e a página em si usam os
// mesmos dados - assim só se pedem uma vez à base de dados.
const getBrandPageData = cache(async function getBrandPageData(slug: string) {
  const { data: brand } = await supabase.from('brands').select('id, name, slug').eq('slug', slug).maybeSingle()
  if (!brand) return null

  const { products, error } = await getProductsWithPrice({ brandId: (brand as Brand).id })
  // Erro da base de dados: não guardar uma página vazia (fica a versão
  // anterior, ver app/catalogo/page.tsx).
  if (error) throw new Error(`Marca ${slug}: erro ao carregar produtos (${error})`)
  const brandProducts = products
        .filter((product) => product.brand_id === (brand as Brand).id)
        .sort((a, b) => {
          // Com stock primeiro, depois do mais barato para o mais caro.
          if (a.lowest_price == null) return 1
          if (b.lowest_price == null) return -1
          return a.lowest_price - b.lowest_price
        })

  const prices = brandProducts.map((p) => p.lowest_price).filter((price): price is number => price != null)
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null

  // Para o browser só seguem os campos que os cartões usam (ver
  // lib/slimForGrid.ts) - sem isto a página da adidas passava dos 20 MB.
  return { brand: brand as Brand, products: brandProducts.map(slimForGrid), lowestPrice }
})

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

export default async function MarcaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getBrandPageData(slug)
  if (!data) notFound()

  const { brand, products } = data
  const pageUrl = `${SITE_URL}/marcas/${brand.slug}`

  // Dados estruturados para o Google: percurso (Parjusto > Marcas > Nike)
  // e a lista de ténis desta página (os primeiros 100 - com milhares de
  // ténis a lista ficava enorme).
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
      itemListElement: products.slice(0, 100).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/produto/${product.slug}`,
        name: `${brand.name} ${product.model_name}`,
      })),
    },
  ]

  // Cabeçalho: percurso, nome da marca e total de ténis. É também o que se
  // vê enquanto a grelha carrega (Suspense), por isso a página não "salta".
  const heading = (
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

      <h1 className="mt-6 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B] sm:text-[44px]">
        {brand.name}
      </h1>
      <p className="mb-8 mt-3 text-sm text-[#5C6770]">
        {products.length} ténis
      </p>
    </div>
  )

  return (
    <main className="w-full pb-20 pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {products.length === 0 ? (
        <>
          {heading}
          <div className="mt-10 px-6">
            <p className="text-[#5C6770]">Neste momento não temos ténis {brand.name} no catálogo.</p>
            <Link
              href="/catalogo"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#17232B] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#17232B]/85"
            >
              Ver o catálogo
            </Link>
          </div>
        </>
      ) : (
        <Suspense fallback={heading}>
          <ProductGrid products={products} heading={heading} hideBrandFilter />
        </Suspense>
      )}

      <BackToTopButton />
    </main>
  )
}
