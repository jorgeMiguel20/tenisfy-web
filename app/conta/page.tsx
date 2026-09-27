// app/conta/page.tsx
import type { Metadata } from 'next'
import ContaView from '@/components/ContaView'

export const metadata: Metadata = {
  title: 'A minha conta | Parjusto',
  robots: { index: false, follow: false },
}

// Página estática - tudo o que é pessoal (email, favoritos, alertas) é
// carregado no browser, ver components/ContaView.tsx.
export default function ContaPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <ContaView />
    </main>
  )
}
