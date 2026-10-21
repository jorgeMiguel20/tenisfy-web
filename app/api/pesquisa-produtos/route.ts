// app/api/pesquisa-produtos/route.ts
//
// Lista leve de todos os ténis visíveis (nome, marca, foto e preço mais
// baixo) para a caixa "Adicionar outro produto" do /comparar. É pedida só
// quando a pessoa abre essa caixa. Fica guardada 1 hora no servidor da
// Vercel, por isso as visitas seguintes recebem-na logo, sem ir à base de
// dados.
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchAll } from '@/lib/fetchAll'

export const revalidate = 3600

type Row = {
  id: string
  slug: string
  model_name: string
  image_url: string | null
  brands: { name: string } | null
  product_offers: { price: number; in_stock: boolean; discontinued_at: string | null }[] | null
}

export async function GET() {
  // Bocados de 400 (ver lib/fetchAll.ts e lib/getProductsWithPrice.ts): a
  // base de dados corta pedidos que demorem mais de 3 segundos.
  const { data, error } = await fetchAll<Row>((from, to) =>
    supabase
      .from('products')
      .select('id, slug, model_name, image_url, brands (name), product_offers (price, in_stock, discontinued_at)')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{ data: Row[] | null; error: { message: string } | null }>,
    400
  )

  // Em caso de erro responde 500 (a Vercel não guarda erros - e se já havia
  // uma lista boa guardada, continua a servir essa).
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os produtos.' }, { status: 500 })

  const list = data.map((p) => {
    const prices = (p.product_offers ?? [])
      .filter((o) => o.in_stock && !o.discontinued_at)
      .map((o) => o.price)
    return {
      id: p.id,
      slug: p.slug,
      model_name: p.model_name,
      image_url: p.image_url ?? null,
      brands: p.brands ? { name: p.brands.name } : null,
      lowest_price: prices.length > 0 ? Math.min(...prices) : null,
    }
  })

  return NextResponse.json(list)
}
