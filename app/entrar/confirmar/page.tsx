// app/entrar/confirmar/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import ConfirmarEntrada from '@/components/ConfirmarEntrada'

export const metadata: Metadata = {
  title: 'Entrar | Parjusto',
  robots: { index: false, follow: false },
}

// Destino do botão "Entrar no Parjusto" do email de entrada. Página
// estática - a verificação do link corre no browser (ver
// components/ConfirmarEntrada.tsx).
export default function ConfirmarEntradaPage() {
  return (
    <main className="max-w-md mx-auto px-6 py-14">
      <Suspense fallback={null}>
        <ConfirmarEntrada />
      </Suspense>
    </main>
  )
}
