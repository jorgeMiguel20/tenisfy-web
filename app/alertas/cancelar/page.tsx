// app/alertas/cancelar/page.tsx
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Metadata } from 'next'
import AlertTokenForm from '@/components/AlertTokenForm'
import { cancelAlertAction } from '@/app/alertas/actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cancelar alerta | Parjusto',
  robots: { index: false, follow: false },
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BUTTON_CLASS =
  'inline-flex min-h-[44px] items-center rounded-none bg-[#123F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

type AlertForPage = {
  is_active: boolean
  products: { model_name: string; brands: { name: string } | null } | null
}

// Abrir o link do email só MOSTRA o alerta - o cancelamento acontece quando
// a pessoa carrega no botão (ver app/alertas/actions.ts, que explica
// porquê).
export default async function CancelarAlertaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token: rawToken } = await searchParams
  const token = typeof rawToken === 'string' && UUID_REGEX.test(rawToken) ? rawToken : null
  const supabase = getServiceClient()

  let outcome: 'pending' | 'already' | 'invalid' | 'error' = 'invalid'
  let alert: AlertForPage | null = null

  if (token && supabase) {
    const { data, error } = await supabase
      .from('price_alerts')
      .select('is_active, products (model_name, brands (name))')
      .eq('unsubscribe_token', token)
      .maybeSingle()

    if (error) {
      outcome = 'error'
    } else if (data) {
      alert = data as unknown as AlertForPage
      outcome = alert.is_active ? 'pending' : 'already'
    }
  } else if (token && !supabase) {
    outcome = 'error'
  }

  const product = alert?.products ?? null
  const productName = product ? `${product.brands?.name ?? ''} ${product.model_name}`.trim() : null

  return (
    <main className="max-w-lg mx-auto px-6 py-20 text-center">
      {outcome === 'pending' && token && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Cancelar alerta</h1>
          <p className="text-gray-500 mb-6">
            {productName
              ? `Queres deixar de receber avisos de preço do ${productName}?`
              : 'Queres deixar de receber avisos deste alerta de preço?'}
          </p>
          <AlertTokenForm
            token={token}
            action={cancelAlertAction}
            buttonLabel="Cancelar alerta"
            pendingLabel="A cancelar..."
            successTitle="Alerta cancelado"
            successText="Não vais receber mais e-mails deste alerta."
            backHref="/"
            backLabel="Ir para o Parjusto"
          />
        </>
      )}
      {outcome === 'already' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Alerta já cancelado</h1>
          <p className="text-gray-500 mb-6">Não vais receber mais e-mails deste alerta.</p>
          <Link href="/" className={BUTTON_CLASS}>
            Ir para o Parjusto
          </Link>
        </>
      )}
      {outcome === 'invalid' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Link inválido</h1>
          <p className="text-gray-500 mb-6">Este link de cancelamento não é válido ou o alerta já expirou.</p>
          <Link href="/" className={BUTTON_CLASS}>
            Ir para o Parjusto
          </Link>
        </>
      )}
      {outcome === 'error' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Algo correu mal</h1>
          <p className="text-gray-500 mb-6">Tenta novamente mais tarde.</p>
          <Link href="/" className={BUTTON_CLASS}>
            Ir para o Parjusto
          </Link>
        </>
      )}
    </main>
  )
}
