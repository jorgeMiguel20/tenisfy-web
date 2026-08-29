// app/api/admin/price-check-targets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isPriceSyncAuthorized } from '@/lib/priceSync'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Fonte única de verdade para o que precisa de ser verificado: lê
// diretamente de product_offers/products/stores, nada de lista duplicada
// mantida à parte. Só ofertas de produtos e lojas ativos, e nunca ofertas já
// descontinuadas (ver "Descontinuar oferta" em /admin/precos) - a loja
// deixou de as vender, não faz sentido o agente continuar a verificá-las
// todos os dias.
export async function GET(request: NextRequest) {
  if (!isPriceSyncAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('product_offers')
    .select(`
      id, size, price, in_stock, affiliate_url, last_checked_at,
      products!inner (model_name, slug, is_active, brands (name)),
      stores!inner (name, is_active)
    `)
    .eq('products.is_active', true)
    .eq('stores.is_active', true)
    .is('discontinued_at', null)
    .order('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const targets = (data ?? []).map((row: any) => ({
    product_offer_id: row.id,
    product_name: `${row.products?.brands?.name ?? ''} ${row.products?.model_name ?? ''}`.trim(),
    product_slug: row.products?.slug ?? null,
    size: row.size,
    store_name: row.stores?.name ?? null,
    url: row.affiliate_url,
    current_price: row.price,
    current_in_stock: row.in_stock,
    last_checked_at: row.last_checked_at,
  }))

  return NextResponse.json({ targets })
}
