// app/robots.ts
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl'

// Áreas que não interessam ao Google: o painel de administração, as rotas
// internas da API e as páginas de confirmar/cancelar alertas (links de
// email pessoais). /favoritos e /comparar continuam acessíveis, mas levam
// "noindex" na própria página (se estivessem bloqueadas aqui, o Google
// nem conseguia ler esse "noindex").
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/alertas/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
