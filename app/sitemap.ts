// app/sitemap.ts
import { supabase } from '@/lib/supabase'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: products } = await supabase.from('products').select('slug')

  const productUrls = (products ?? []).map((p) => ({
    url: `https://tenisfy-web.vercel.app/produto/${p.slug}`,
    lastModified: new Date(),
  }))

  return [
    {
      url: 'https://tenisfy-web.vercel.app',
      lastModified: new Date(),
    },
    ...productUrls,
  ]
}