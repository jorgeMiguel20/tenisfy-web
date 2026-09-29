// app/alertas/actions.ts
'use server'

import { createClient } from '@supabase/supabase-js'

// Confirmar e cancelar alertas só acontece quando a pessoa carrega no botão
// da página (antes bastava abrir o link). Alguns programas de email (ex.:
// Outlook, antivírus de empresas) abrem sozinhos os links dos emails para
// os analisar - e isso confirmava ou cancelava alertas sem a pessoa querer.

export type AlertActionState = { status: 'idle' | 'ok' | 'invalid' | 'error' }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function readToken(formData: FormData): string | null {
  const token = formData.get('token')
  return typeof token === 'string' && UUID_REGEX.test(token) ? token : null
}

export async function confirmAlertAction(
  _previous: AlertActionState,
  formData: FormData
): Promise<AlertActionState> {
  const token = readToken(formData)
  if (!token) return { status: 'invalid' }

  const supabase = getServiceClient()
  if (!supabase) return { status: 'error' }

  const { data: alert, error } = await supabase
    .from('price_alerts')
    .select('id, confirmed_at')
    .eq('confirmation_token', token)
    .maybeSingle()

  if (error) return { status: 'error' }
  if (!alert) return { status: 'invalid' }

  if (!alert.confirmed_at) {
    const { error: updateError } = await supabase
      .from('price_alerts')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', alert.id)
    if (updateError) return { status: 'error' }
  }
  return { status: 'ok' }
}

export async function cancelAlertAction(
  _previous: AlertActionState,
  formData: FormData
): Promise<AlertActionState> {
  const token = readToken(formData)
  if (!token) return { status: 'invalid' }

  const supabase = getServiceClient()
  if (!supabase) return { status: 'error' }

  const { data, error } = await supabase
    .from('price_alerts')
    .update({ is_active: false })
    .eq('unsubscribe_token', token)
    .select('id')
    .maybeSingle()

  if (error) return { status: 'error' }
  return { status: data ? 'ok' : 'invalid' }
}
