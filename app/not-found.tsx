// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-20 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]">
        Erro 404
      </p>
      <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-balance text-[#17232B] md:text-[44px]">
        Não encontrámos esse par
      </h1>
      <p className="mt-4 text-[#5C6770]">
        A página que procuras não existe ou foi movida. Talvez o modelo que
        procuras ainda não esteja no nosso catálogo.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-[44px] items-center rounded-none bg-[#123F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
      >
        Voltar à página inicial
      </Link>
    </main>
  )
}
