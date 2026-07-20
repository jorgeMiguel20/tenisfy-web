// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-orange-600">
        Erro 404
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">
        Não encontrámos esse par
      </h1>
      <p className="text-gray-500 mt-4">
        A página que procuras não existe ou foi movida. Talvez o modelo que
        procuras ainda não esteja no nosso catálogo.
      </p>
      <Link
        href="/"
        className="inline-block mt-8 bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        Voltar à página inicial
      </Link>
    </main>
  )
}