// lib/slimForGrid.ts
//
// Só os campos que a grelha, os filtros e os cartões usam. Com milhares de
// ténis (importação automática das lojas afiliadas), mandar para o browser
// as ofertas de cada tamanho, descrições, etc. tornava as páginas pesadas -
// a página da adidas chegou a passar dos 20 MB que a Vercel aceita e deixou
// de abrir. As fotos extra do cartão (que se veem ao deslizar no telemóvel)
// ficam limitadas a 3 por ténis.
//
// Usado no catálogo (app/catalogo/page.tsx) e nas páginas de cada marca
// (app/marcas/[slug]/page.tsx).
import type { ProductWithPrice } from '@/lib/types'
import { mainColor } from '@/lib/colors'

export function slimForGrid(p: ProductWithPrice): ProductWithPrice {
  return {
    id: p.id,
    brand_id: p.brand_id,
    model_name: p.model_name,
    slug: p.slug,
    category: p.category,
    gender: p.gender,
    color: p.color,
    base_colors: p.base_colors,
    main_color: mainColor(p.color),
    color_variant_group: null,
    image_urls: (p.image_urls ?? []).slice(0, 3),
    description: null,
    image_url: p.image_url,
    is_active: p.is_active,
    created_at: p.created_at,
    brands: { id: p.brands?.id, name: p.brands?.name, slug: p.brands?.slug, logo_url: null } as ProductWithPrice['brands'],
    lowest_price: p.lowest_price,
    store_count: p.store_count,
    sizes: p.sizes,
    savings: p.savings ?? null,
    priceDrop: p.priceDrop ?? null,
  }
}
