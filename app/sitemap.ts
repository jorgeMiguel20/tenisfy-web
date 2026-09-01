// app/sitemap.ts
import { supabase } from '@/lib/supabase'
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl'

// Paginas estaticas do site que valem a pena indexar (fora do catalogo de
// produtos, que e gerado dinamicamente abaixo).
const STATIC_PAGES = ['/catalogo', '/sobre', '/comparar', '/divulgacao-afiliados', '/termos', '/privacidade']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: products } = await supabase.from('products').select('slug, created_at')

  const productUrls = (products ?? []).map((p) => ({
    url: `${SITE_URL}/produto/${p.slug}`,
    // Usa a data real de criacao do produto em vez de "agora" - mais honesto
    // para o Google perceber quais paginas mudaram de facto.
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
  }))

  const staticUrls = STATIC_PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }))

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
    },
    ...staticUrls,
    ...productUrls,
  ]
}
