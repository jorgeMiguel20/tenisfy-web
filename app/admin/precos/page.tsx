// app/admin/precos/page.tsx
import type { Metadata } from 'next'
import PriceCheckButton from './PriceCheckButton'

// noindex: página interna, não deve ser indexada nem aparecer em resultados
// de pesquisa mesmo que alguém a ligue por engano nalgum lado.
export const metadata: Metadata = {
  title: 'Verificar preços | Parjusto',
  robots: { index: false, follow: false },
}

export default function AdminPrecosPage() {
  return (
    <main className="max-w-xl mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificar preços</h1>
      <p className="text-gray-500 mb-8">
        Clica depois de confirmares os preços em todas as lojas. Isto atualiza a data
        mostrada em cada página de produto.
      </p>
      <PriceCheckButton />
    </main>
  )
}
