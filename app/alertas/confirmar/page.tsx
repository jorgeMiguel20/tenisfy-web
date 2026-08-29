// app/alertas/confirmar/page.tsx
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Confirmar alerta | Parjusto',
  robots: { index: false, follow: false },
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

export default async function ConfirmarAlertaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const supabase = getServiceClient()

  let outcome: 'ok' | 'invalid' | 'error' = 'error'
  let productSlug: string | null = null

  if (token && supabase) {
    const { data: alert } = await supabase
      .from('price_alerts')
      .select('id, confirmed_at, products (slug)')
      .eq('confirmation_token', token)
      .maybeSingle()

    if (!alert) {
      outcome = 'invalid'
    } else {
      if (!alert.confirmed_at) {
        await supabase
          .from('price_alerts')
          .update({ confirmed_at: new Date().toISOString() })
          .eq('id', alert.id)
      }
      outcome = 'ok'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productSlug = (alert.products as any)?.slug ?? null
    }
  } else if (!token) {
    outcome = 'invalid'
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-20 text-center">
      {outcome === 'ok' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Alerta confirmado</h1>
          <p className="text-gray-500 mb-6">
            Vamos avisar-te por e-mail assim que o preço descer ao valor que escolheste.
          </p>
        </>
      )}
      {outcome === 'invalid' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Link inválido</h1>
          <p className="text-gray-500 mb-6">Este link de confirmação não é válido ou já foi usado.</p>
        </>
      )}
      {outcome === 'error' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Algo correu mal</h1>
          <p className="text-gray-500 mb-6">Tenta novamente mais tarde.</p>
        </>
      )}
      <Link
        href={productSlug ? `/produto/${productSlug}` : '/'}
        className="inline-block bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        {productSlug ? 'Voltar ao produto' : 'Ir para o Parjusto'}
      </Link>
    </main>
  )
}
