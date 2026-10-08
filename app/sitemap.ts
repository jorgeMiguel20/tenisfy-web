// app/sitemap.ts
import { supabase } from '@/lib/supabase'
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl'
import { GUIDES } from '@/lib/guides'

// Páginas fixas que vale a pena indexar. Ficam de fora /comparar e
// /favoritos (páginas com "noindex", ver os respetivos page.tsx).
const STATIC_PAGES = ['/catalogo', '/marcas', '/guias', '/promocoes', '/sobre', '/divulgacao-afiliados', '/termos', '/privacidade']

// Uma hora de cache, como as páginas do site.
export const revalidate = 3600

type SitemapProductRow = {
  slug: string
  created_at: string | null
  product_offers: { last_checked_at: string | null; discontinued_at: string | null }[] | null
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabase
    .from('products')
    .select('slug, created_at, product_offers (last_checked_at, discontinued_at)')
    .eq('is_active', true)

  const products = (data ?? []) as unknown as SitemapProductRow[]

  // lastModified = a última vez que um preço deste ténis foi verificado
  // (é o que muda na página). Antes era a data de criação do produto, que
  // nunca mudava - o Google não tinha como saber que o preço mudou.
  const productUrls = products.map((p) => {
    const checkedDates = (p.product_offers ?? [])
      .filter((o) => !o.discontinued_at && o.last_checked_at)
      .map((o) => o.last_checked_at as string)
      .sort()
    const lastChecked = checkedDates[checkedDates.length - 1] ?? p.created_at
    return {
      url: `${SITE_URL}/produto/${p.slug}`,
      ...(lastChecked ? { lastModified: new Date(lastChecked) } : {}),
    }
  })

  // Sem lastModified nas páginas fixas: antes diziam sempre "atualizada
  // agora" em cada pedido, o que não era verdade e o Google aprende a
  // ignorar.
  const staticUrls = STATIC_PAGES.map((path) => ({ url: `${SITE_URL}${path}` }))

  // Páginas de marca (/marcas/nike, ...) - só as marcas com pelo menos um
  // ténis ativo (as outras ficam com "noindex", ver app/marcas/[slug]).
  const { data: brandRows } = await supabase.from('brands').select('slug, products (is_active)')
  const brandUrls = ((brandRows ?? []) as unknown as { slug: string; products: { is_active: boolean | null }[] | null }[])
    .filter((brand) => (brand.products ?? []).some((product) => product.is_active))
    .map((brand) => ({ url: `${SITE_URL}/marcas/${brand.slug}` }))

  // Guias (/guias/...) - ver lib/guides.ts.
  const guideUrls = GUIDES.map((guide) => ({ url: `${SITE_URL}/guias/${guide.slug}`, lastModified: new Date(guide.publishedAt) }))

  return [{ url: SITE_URL }, ...staticUrls, ...guideUrls, ...brandUrls, ...productUrls]
}
