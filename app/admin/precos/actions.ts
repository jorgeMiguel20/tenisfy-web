// app/admin/precos/actions.ts
'use server'

import { createClient } from '@supabase/supabase-js'

type MarkPricesResult =
  | { success: true; timestamp: string; count: number }
  | { success: false; error: string }

// A rota /admin/precos já está protegida por password no middleware.ts
// (HTTP Basic Auth) - esta ação só corre depois disso, por isso não repete
// a verificação de password aqui.
export async function markPricesVerified(): Promise<MarkPricesResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuração do Supabase em falta no servidor.' }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('product_offers')
    .update({ last_checked_at: now })
    .not('id', 'is', null)
    .select('id, price')

  if (error) {
    return { success: false, error: error.message }
  }

  // Um ponto de histórico por oferta, alinhado com esta verificação - é o
  // que alimenta o gráfico de preços na página de produto.
  const historyRows = (data ?? []).map((offer) => ({
    product_offer_id: offer.id,
    price: offer.price,
    recorded_at: now,
  }))

  if (historyRows.length > 0) {
    const { error: historyError } = await supabase.from('price_history').insert(historyRows)

    if (historyError) {
      return { success: false, error: `Preços atualizados, mas falhou o registo no histórico: ${historyError.message}` }
    }
  }

  return { success: true, timestamp: now, count: data?.length ?? 0 }
}
