// app/alertas/confirmar/page.tsx
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Metadata } from 'next'
import AlertTokenForm from '@/components/AlertTokenForm'
import { confirmAlertAction } from '@/app/alertas/actions'
import { formatPrice } from '@/lib/formatPrice'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Confirmar alerta | Parjusto',
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
  confirmed_at: string | null
  target_price: number
  products: { slug: string; model_name: string; brands: { name: string } | null } | null
}

// Abrir o link do email só MOSTRA o alerta - a confirmação acontece quando
// a pessoa carrega no botão (ver app/alertas/actions.ts, que explica
// porquê).
export default async function ConfirmarAlertaPage({
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
      .select('confirmed_at, target_price, products (slug, model_name, brands (name))')
      .eq('confirmation_token', token)
      .maybeSingle()

    if (error) {
      outcome = 'error'
    } else if (data) {
      alert = data as unknown as AlertForPage
      outcome = alert.confirmed_at ? 'already' : 'pending'
    }
  } else if (token && !supabase) {
    outcome = 'error'
  }

  const product = alert?.products ?? null
  const productName = product ? `${product.brands?.name ?? ''} ${product.model_name}`.trim() : null
  const backHref = product ? `/produto/${product.slug}` : '/'
  const backLabel = product ? 'Voltar ao produto' : 'Ir para o Parjusto'

  return (
    <main className="max-w-lg mx-auto px-6 py-20 text-center">
      {outcome === 'pending' && token && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Confirma o teu alerta</h1>
          <p className="text-gray-500 mb-6">
            {productName && alert
              ? `Vamos avisar-te quando o ${productName} descer para ${formatPrice(alert.target_price)} ou menos.`
              : 'Vamos avisar-te quando o preço descer ao valor que escolheste.'}{' '}
            Carrega no botão para ativar o alerta.
          </p>
          <AlertTokenForm
            token={token}
            action={confirmAlertAction}
            buttonLabel="Confirmar alerta"
            pendingLabel="A confirmar..."
            successTitle="Alerta confirmado"
            successText="Vamos avisar-te por e-mail assim que o preço descer ao valor que escolheste."
            backHref={backHref}
            backLabel={backLabel}
          />
        </>
      )}
      {outcome === 'already' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Alerta já confirmado</h1>
          <p className="text-gray-500 mb-6">
            Este alerta já está ativo. Vamos avisar-te por e-mail quando o preço descer.
          </p>
          <Link href={backHref} className={BUTTON_CLASS}>
            {backLabel}
          </Link>
        </>
      )}
      {outcome === 'invalid' && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Link inválido</h1>
          <p className="text-gray-500 mb-6">Este link de confirmação não é válido ou o alerta já expirou.</p>
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
