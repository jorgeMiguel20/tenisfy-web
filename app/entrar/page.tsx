// app/entrar/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import EntrarForm from '@/components/EntrarForm'

export const metadata: Metadata = {
  title: 'Entrar | Parjusto',
  description: 'Entra com o teu email para teres os teus favoritos e alertas de preço em todos os teus dispositivos.',
  robots: { index: false, follow: false },
}

// Página estática: o formulário (e tudo o que depende da sessão) corre no
// browser - ver components/EntrarForm.tsx.
export default function EntrarPage() {
  return (
    <main className="max-w-md mx-auto px-6 py-14">
      <Suspense fallback={null}>
        <EntrarForm />
      </Suspense>
    </main>
  )
}
