// app/sitemap.ts
import { supabase } from '@/lib/supabase'
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: products } = await supabase.from('products').select('slug')

  const productUrls = (products ?? []).map((p) => ({
    url: `${SITE_URL}/produto/${p.slug}`,
    lastModified: new Date(),
  }))

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
    },
    ...productUrls,
  ]
}