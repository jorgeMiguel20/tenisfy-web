// app/api/admin/size-discovery-targets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isPriceSyncAuthorized } from '@/lib/priceSync'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Remove parâmetros de query só usados para pré-seleccionar um tamanho na UI
// da loja (ex: adidas.pt "?forceSelSize=40") - a página é a mesma, e é essa
// URL "limpa" que queremos tanto para o agente visitar como para, se um
// tamanho novo for aprovado, passar a ser o link "Ver oferta" mostrado ao
// cliente (pedido do Jorge: nunca mostrar o forceSelSize da última vez que
// alguém verificou um tamanho específico).
function cleanUrl(url: string): string {
  try {
    const u = new URL(url)
    u.search = ''
    return u.toString()
  } catch {
    return url
  }
}

// Uma linha por (produto, loja) - não por tamanho. O agente só precisa de
// visitar a página do produto na loja uma vez para ver todos os tamanhos que
// a loja vende (confirmado com o Jorge para adidas.pt: é uma única página,
// "?forceSelSize=X" é só cosmético do lado do cliente). known_sizes diz ao
// agente que tamanhos já existem em product_offers, para só reportar os que
// ainda faltam - toda a lógica de "o que é novo" fica aqui no servidor, o
// agente não fala directamente com a base de dados.
export async function GET(request: NextRequest) {
  if (!isPriceSyncAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('product_offers')
    .select(`
      product_id, store_id, size, price, affiliate_url, created_at,
      products!inner (model_name, slug, is_active, brands (name)),
      stores!inner (name, is_active)
    `)
    .eq('products.is_active', true)
    .eq('stores.is_active', true)
    .is('discontinued_at', null)
    .order('created_at')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type Group = {
    product_id: string
    store_id: string
    product_name: string
    product_slug: string | null
    store_name: string
    url: string
    current_price: number
    known_sizes: string[]
  }

  const groups = new Map<string, Group>()

  for (const row of (data ?? []) as any[]) {
    const key = `${row.product_id}::${row.store_id}`
    const existing = groups.get(key)

    if (existing) {
      existing.known_sizes.push(row.size)
      continue
    }

    groups.set(key, {
      product_id: row.product_id,
      store_id: row.store_id,
      product_name: `${row.products?.brands?.name ?? ''} ${row.products?.model_name ?? ''}`.trim(),
      product_slug: row.products?.slug ?? null,
      store_name: row.stores?.name ?? null,
      // Primeira oferta (mais antiga) desta combinação produto+loja como
      // página representativa a visitar - qualquer tamanho já registado
      // partilha a mesma página de produto na loja.
      url: cleanUrl(row.affiliate_url),
      current_price: row.price,
      known_sizes: [row.size],
    })
  }

  return NextResponse.json({ targets: Array.from(groups.values()) })
}
