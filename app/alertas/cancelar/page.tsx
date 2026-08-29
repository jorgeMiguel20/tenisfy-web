// app/alertas/cancelar/page.tsx
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cancelar alerta | Parjusto',
  robots: { index: false, follow: false },
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

export default async function CancelarAlertaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const supabase = getServiceClient()

  let outcome: 'ok' | 'invalid' | 'error' = 'error'

  if (token && supabase) {
    const { data, error } = await supabase
      .from('price_alerts')
      .update({ is_active: false })
      .eq('unsubscribe_token', token)
      .select('id')
      .maybeSingle()

    outcome = error ? 'error' : data ? 'ok' : 'invalid'
  } else if (!token) {
    outcome = 'invalid'
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-20 text-center">
      {outcome === 'ok' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Alerta cancelado</h1>
          <p className="text-gray-500 mb-6">Não vais receber mais e-mails deste alerta.</p>
        </>
      )}
      {outcome === 'invalid' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Link inválido</h1>
          <p className="text-gray-500 mb-6">Este link de cancelamento não é válido.</p>
        </>
      )}
      {outcome === 'error' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Algo correu mal</h1>
          <p className="text-gray-500 mb-6">Tenta novamente mais tarde.</p>
        </>
      )}
      <Link
        href="/"
        className="inline-block bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        Ir para o Parjusto
      </Link>
    </main>
  )
}
