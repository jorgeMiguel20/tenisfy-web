// components/HomeHero.tsx
import Link from 'next/link'

// Chips de sugestão: apontam para /?q=..., que o ProductGrid já lê como
// pesquisa inicial (ver o parâmetro "q" sincronizado em ProductGrid.tsx).
const SUGGESTIONS = ['Air Force 1', 'Samba', 'New Balance 550']

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl mb-10 min-h-[420px] flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/hero-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10"
      />

      <div className="relative px-6 py-14 sm:px-12 sm:py-20 max-w-xl">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          Encontra o par certo.
          <br />
          Ao preço{' '}
          <span className="underline decoration-orange-500 decoration-4 underline-offset-[7px]">
            certo
          </span>
          .
        </h1>
        <p className="mt-4 text-white/80 text-lg max-w-md">
          Compara preços, stock e tamanhos nas melhores lojas.
        </p>

        {/* Pesquisa real: formulário GET simples, sem precisar de JS —
            "/" já lê ?q= (ver ProductGrid.tsx) e aplica-o à grelha abaixo. */}
        <form action="/#catalogo" method="get" className="mt-6 flex items-center gap-2 bg-white rounded-full p-1.5 pl-5 shadow-lg max-w-md">
          <input
            type="text"
            name="q"
            placeholder="Pesquisa por modelo, marca..."
            className="flex-1 min-w-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
          />
          <button
            type="submit"
            aria-label="Pesquisar"
            className="w-10 h-10 rounded-full bg-orange-600 hover:bg-orange-700 transition-colors flex items-center justify-center text-white shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2 max-w-md">
          {SUGGESTIONS.map((term) => (
            <Link
              key={term}
              href={`/?q=${encodeURIComponent(term)}#catalogo`}
              className="text-xs font-semibold bg-white/90 hover:bg-white text-gray-700 rounded-full px-3 py-1.5 transition-colors"
            >
              {term}
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-6 text-sm font-semibold text-white">
          <span className="flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            Verificado todos os dias
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            Alertas de preço grátis
          </span>
        </div>
      </div>
    </section>
  )
}
