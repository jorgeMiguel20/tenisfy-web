// app/conta/actions.ts
'use server'

import { getServiceClient, getVerifiedUser } from '@/lib/authServer'

export type MyAlert = {
  id: string
  productId: string
  slug: string
  modelName: string
  brandName: string
  imageUrl: string | null
  targetPrice: number
  expiresAt: string | null
}

type AlertRow = {
  id: string
  product_id: string
  target_price: number
  expires_at: string | null
  products: { slug: string; model_name: string; image_url: string | null; brands: { name: string } | null } | null
}

// Alertas de preço ativos da pessoa com sessão iniciada (null se não tiver
// sessão). Confirma sempre no servidor quem é a pessoa (getVerifiedUser) e
// só depois lê com a service role - a tabela price_alerts não é acessível
// diretamente do browser.
//
// Alertas criados antes de a pessoa ter conta, com o mesmo email, passam
// a ficar ligados à conta. Como entrar exige abrir o email, isso prova que
// o email é dela - por isso também ficam confirmados (quem os criou já não
// precisa de carregar no link de confirmação que recebeu antes).
export async function getMyAlerts(): Promise<MyAlert[] | null> {
  const user = await getVerifiedUser()
  if (!user?.email) return null

  const supabase = getServiceClient()
  if (!supabase) return null

  const email = user.email.toLowerCase()
  await supabase.from('price_alerts').update({ user_id: user.id }).eq('email', email).is('user_id', null)
  await supabase
    .from('price_alerts')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('confirmed_at', null)

  const { data, error } = await supabase
    .from('price_alerts')
    .select('id, product_id, target_price, expires_at, products (slug, model_name, image_url, brands (name))')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('last_notified_at', null)
    .order('created_at', { ascending: false })

  if (error || !data) return null

  const now = Date.now()
  return (data as unknown as AlertRow[])
    // Já expirados mas ainda não apagados pela limpeza diária - não contam.
    .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > now)
    .map((row) => ({
      id: row.id,
      productId: row.product_id,
      slug: row.products?.slug ?? '',
      modelName: row.products?.model_name ?? '',
      brandName: row.products?.brands?.name ?? '',
      imageUrl: row.products?.image_url ?? null,
      targetPrice: row.target_price,
      expiresAt: row.expires_at,
    }))
}

// Apaga um alerta - só se for mesmo da pessoa com sessão iniciada.
export async function deleteMyAlert(alertId: string): Promise<boolean> {
  const user = await getVerifiedUser()
  if (!user) return false
  const supabase = getServiceClient()
  if (!supabase) return false

  const { error } = await supabase.from('price_alerts').delete().eq('id', alertId).eq('user_id', user.id)
  return !error
}

// "Apagar a minha conta" (direito ao apagamento - RGPD): apaga os alertas
// de preço (os ligados à conta e os criados com o mesmo email antes de
// haver conta) e a própria conta. Os favoritos da conta são apagados
// automaticamente pela base de dados junto com a conta (ver
// sql/accounts.sql, "on delete cascade").
export async function deleteMyAccount(): Promise<boolean> {
  const user = await getVerifiedUser()
  if (!user) return false
  const supabase = getServiceClient()
  if (!supabase) return false

  const { error: alertsError } = await supabase.from('price_alerts').delete().eq('user_id', user.id)
  if (alertsError) return false
  if (user.email) {
    const { error: emailAlertsError } = await supabase
      .from('price_alerts')
      .delete()
      .eq('email', user.email.toLowerCase())
    if (emailAlertsError) return false
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id)
  return !error
}
