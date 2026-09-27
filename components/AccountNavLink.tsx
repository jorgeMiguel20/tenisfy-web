// components/AccountNavLink.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/authBrowser'

function PersonIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill={filled ? 'currentColor' : 'none'} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

// Link para a conta no cabeçalho (só no desktop - no telemóvel fica dentro
// do menu, ver MobileAccountLink abaixo, para não apertar ainda mais a
// barra de cima). Sem sessão leva a "Entrar" e volta depois à página onde
// a pessoa estava; com sessão leva a "A minha conta" e o ícone fica
// preenchido.
export default function AccountNavLink() {
  const auth = useAuth()
  const pathname = usePathname()
  const signedIn = auth.status === 'signed-in'
  const href = signedIn
    ? '/conta'
    : pathname && pathname !== '/entrar' && !pathname.startsWith('/entrar/')
      ? `/entrar?next=${encodeURIComponent(pathname)}`
      : '/entrar'

  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={signedIn ? 'A minha conta' : 'Entrar'}
      title={signedIn ? 'A minha conta' : 'Entrar'}
      className="hidden sm:flex shrink-0 items-center justify-center min-h-[44px] px-1 text-gray-600 hover:text-gray-900 transition-colors"
    >
      <PersonIcon filled={signedIn} />
    </Link>
  )
}

export function MobileAccountLink({ onNavigate, className }: { onNavigate: () => void; className: string }) {
  const auth = useAuth()
  const signedIn = auth.status === 'signed-in'
  return (
    <Link href={signedIn ? '/conta' : '/entrar'} prefetch={false} onClick={onNavigate} className={className}>
      {signedIn ? 'A minha conta' : 'Entrar'}
    </Link>
  )
}
