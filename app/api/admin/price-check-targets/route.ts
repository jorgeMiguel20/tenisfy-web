// app/api/admin/price-check-targets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isPriceSyncAuthorized } from '@/lib/priceSync'
import { fetchAll } from '@/lib/fetchAll'

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

  // Só os ténis escolhidos à mão: os importados automaticamente das lojas
  // afiliadas (products.source preenchido) têm preço e stock atualizados
  // todos os dias pelo próprio importador, a partir do ficheiro de produtos
  // da loja - não entram nesta verificação.
  // Aos bocados de 1000 (ver lib/fetchAll.ts) - antes ficava cortado às
  // 1000 ofertas sem dar erro.
  const { data, error } = await fetchAll<unknown>((from, to) =>
    supabase
      .from('product_offers')
      .select(`
      id, size, price, in_stock, affiliate_url, last_checked_at,
      products!inner (model_name, slug, is_active, brands (name)),
      stores!inner (name, is_active)
    `)
      .eq('products.is_active', true)
      .is('products.source', null)
      .eq('stores.is_active', true)
      .is('discontinued_at', null)
      .order('id')
      .order('id')
      .range(from, to) as unknown as PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
  )

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  // Forma das linhas devolvidas pela consulta acima (só os campos usados).
  type TargetRow = {
    id: string
    size: string | null
    price: number
    in_stock: boolean
    affiliate_url: string
    last_checked_at: string | null
    products: { model_name: string; slug: string | null; brands: { name: string } | null } | null
    stores: { name: string } | null
  }

  const targets = ((data ?? []) as unknown as TargetRow[]).map((row) => ({
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
