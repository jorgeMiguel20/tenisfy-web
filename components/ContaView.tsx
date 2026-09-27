// components/ContaView.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteMyAccount, deleteMyAlert } from '@/app/conta/actions'
import { ensureFreshSession, signOutHere, useAuth } from '@/lib/authBrowser'
import { useFavorites } from '@/lib/favorites'
import { refreshMyAlerts, useMyAlerts } from '@/lib/myAlerts'
import { formatPrice } from '@/lib/formatPrice'

const DARK_BUTTON =
  'inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#17232B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#17232B]/85 disabled:opacity-50'
const OUTLINE_BUTTON =
  'inline-flex min-h-[44px] items-center justify-center rounded-none border border-[#17232B]/20 px-5 text-sm font-semibold text-[#17232B] transition-colors hover:border-[#17232B] disabled:opacity-50'

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' }).format(new Date(iso))
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wide text-[#5C6770]">{children}</h2>
}

function AlertsList() {
  const myAlerts = useMyAlerts()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function remove(id: string) {
    setDeletingId(id)
    setError(null)
    await ensureFreshSession()
    const ok = await deleteMyAlert(id).catch(() => false)
    setDeletingId(null)
    if (ok) refreshMyAlerts()
    else setError('Não foi possível apagar o alerta. Tenta de novo.')
  }

  if (myAlerts.status !== 'ready') {
    return <p className="mt-3 text-sm text-[#5C6770]">A carregar...</p>
  }

  if (myAlerts.alerts.length === 0) {
    return (
      <p className="mt-3 text-sm text-[#5C6770]">
        Ainda não tens alertas ativos. Carrega no sino de qualquer ténis para seres avisado quando o preço descer.
      </p>
    )
  }

  return (
    <>
      <ul className="mt-3 border-t border-[#17232B]/10">
        {myAlerts.alerts.map((alert) => {
          const until = formatDate(alert.expiresAt)
          return (
            <li key={alert.id} className="flex items-center gap-3 border-b border-[#17232B]/10 py-3">
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden bg-[#F9FBFC]">
                {alert.imageUrl && (
                  <Image src={alert.imageUrl} alt={alert.modelName} fill sizes="48px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400">{alert.brandName}</p>
                <Link href={`/produto/${alert.slug}`} className="block truncate text-sm font-semibold text-[#17232B] hover:underline">
                  {alert.modelName}
                </Link>
                <p className="text-xs text-[#5C6770]">
                  Abaixo de {formatPrice(alert.targetPrice)}
                  {until ? ` · até ${until}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(alert.id)}
                disabled={deletingId === alert.id}
                className="shrink-0 text-sm text-[#5C6770] underline underline-offset-4 hover:text-[#17232B] disabled:opacity-50"
              >
                {deletingId === alert.id ? 'A apagar...' : 'Apagar'}
              </button>
            </li>
          )
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </>
  )
}

export default function ContaView() {
  const router = useRouter()
  const auth = useAuth()
  const { favorites } = useFavorites()
  const [signingOut, setSigningOut] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)

  async function signOut() {
    setSigningOut(true)
    await signOutHere()
    router.replace('/')
  }

  async function deleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    await ensureFreshSession()
    const ok = await deleteMyAccount().catch(() => false)
    if (!ok) {
      setDeleting(false)
      setDeleteError('Não foi possível apagar a conta. Tenta de novo ou escreve para geral@parjusto.pt.')
      return
    }
    // A conta já não existe - limpa a sessão deste browser.
    await signOutHere()
    setDeleted(true)
  }

  if (deleted) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Conta apagada</h1>
        <p className="mt-3 text-sm text-[#5C6770]">
          Apagámos a tua conta, os teus favoritos e os teus alertas de preço. Podes continuar a usar o Parjusto sem conta.
        </p>
        <Link href="/" className={`${DARK_BUTTON} mt-8`}>
          Ir para o Parjusto
        </Link>
      </div>
    )
  }

  if (auth.status === 'loading') {
    return <p className="text-sm text-[#5C6770]">A carregar...</p>
  }

  if (auth.status === 'signed-out') {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">A minha conta</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5C6770]">
          Não tens sessão iniciada. Entra com o teu email para teres os teus favoritos e alertas de preço em todos os
          teus dispositivos.
        </p>
        <Link href="/entrar?next=%2Fconta" prefetch={false} className={`${DARK_BUTTON} mt-8`}>
          Entrar
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">A minha conta</h1>
      <p className="mt-3 text-sm text-[#5C6770]">
        Entraste como <span className="font-medium text-[#17232B]">{auth.email}</span>
      </p>

      <section className="mt-10">
        <SectionTitle>Favoritos</SectionTitle>
        <p className="mt-3 text-sm text-[#17232B]">
          {favorites.length === 0
            ? 'Ainda sem favoritos.'
            : `${favorites.length} ${favorites.length === 1 ? 'produto guardado' : 'produtos guardados'}.`}{' '}
          <Link href="/favoritos" className="font-medium underline underline-offset-4">
            Ver favoritos
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <SectionTitle>Os meus alertas de preço</SectionTitle>
        <AlertsList />
      </section>

      <section className="mt-10 border-t border-[#17232B]/10 pt-8">
        <button type="button" onClick={signOut} disabled={signingOut} className={OUTLINE_BUTTON}>
          {signingOut ? 'A sair...' : 'Sair'}
        </button>
        <p className="mt-2 text-xs text-[#5C6770]">
          Sais só neste dispositivo. Os teus favoritos e alertas continuam guardados na conta.
        </p>
      </section>

      <section className="mt-10 border-t border-[#17232B]/10 pt-8">
        <SectionTitle>Apagar a minha conta</SectionTitle>
        <p className="mt-3 text-sm leading-relaxed text-[#5C6770]">
          Apaga a conta, os favoritos guardados nela e todos os teus alertas de preço. Não dá para desfazer.
        </p>
        {confirmDelete ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting}
              className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-red-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:opacity-50"
            >
              {deleting ? 'A apagar...' : 'Sim, apagar tudo'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="text-sm text-[#5C6770] hover:text-[#17232B]"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${OUTLINE_BUTTON} mt-4`}>
            Apagar a minha conta
          </button>
        )}
        {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
      </section>
    </div>
  )
}
