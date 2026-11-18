// app/sitemap.ts
import { supabase } from '@/lib/supabase'
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl'
import { GUIDES } from '@/lib/guides'
import { fetchAll } from '@/lib/fetchAll'

// Páginas fixas que vale a pena indexar. Ficam de fora /comparar e
// /favoritos (páginas com "noindex", ver os respetivos page.tsx).
const STATIC_PAGES = ['/catalogo', '/marcas', '/guias', '/promocoes', '/sobre', '/divulgacao-afiliados', '/termos', '/privacidade']

// Seis horas de cache: a lista só muda quando os preços são verificados
// (uma vez por dia) e quando há ténis novos.
export const revalidate = 21600

type SitemapProductRow = {
  slug: string
  lastmod: string | null
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Só os ténis com pelo menos uma oferta em stock (os outros mostram "Sem
  // ofertas" e levam "noindex", ver app/produto/[slug]/page.tsx). A lista e a
  // data da última verificação de preço vêm já calculadas pela base de dados
  // (função sitemap_products, ver sql/sitemap_products.sql): umas poucas
  // centenas de KB em vez de ler as ofertas de todos os ténis, que gastava
  // tráfego do Supabase de cada vez que o sitemap era refeito.
  // Aos bocados de 1000 (ver lib/fetchAll.ts): a base de dados devolve no
  // máximo 1000 linhas de cada vez.
  const { data } = await fetchAll<SitemapProductRow>((from, to) =>
    supabase
      .rpc('sitemap_products')
      .order('slug', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{ data: SitemapProductRow[] | null; error: { message: string } | null }>
  )

  // lastModified = a última vez que um preço deste ténis foi verificado
  // (é o que muda na página).
  const productUrls = data.map((p) => ({
    url: `${SITE_URL}/produto/${p.slug}`,
    ...(p.lastmod ? { lastModified: new Date(p.lastmod) } : {}),
  }))

  // Sem lastModified nas páginas fixas: antes diziam sempre "atualizada
  // agora" em cada pedido, o que não era verdade e o Google aprende a
  // ignorar.
  const staticUrls = STATIC_PAGES.map((path) => ({ url: `${SITE_URL}${path}` }))

  // Páginas de marca (/marcas/nike, ...) - só as marcas com pelo menos um
  // ténis ativo (as outras ficam com "noindex", ver app/marcas/[slug]).
  const { data: brandRows } = await fetchAll<{ slug: string }>((from, to) =>
    supabase
      .from('brands')
      .select('slug, products!inner (id)')
      .eq('products.is_active', true)
      .order('slug')
      .range(from, to) as unknown as PromiseLike<{ data: { slug: string }[] | null; error: { message: string } | null }>
  )
  const brandUrls = Array.from(new Set(brandRows.map((brand) => brand.slug))).map((slug) => ({ url: `${SITE_URL}/marcas/${slug}` }))

  // Guias (/guias/...) - ver lib/guides.ts.
  const guideUrls = GUIDES.map((guide) => ({ url: `${SITE_URL}/guias/${guide.slug}`, lastModified: new Date(guide.publishedAt) }))

  return [{ url: SITE_URL }, ...staticUrls, ...guideUrls, ...brandUrls, ...productUrls]
}
