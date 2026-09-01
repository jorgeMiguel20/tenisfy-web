// components/HomeHero.tsx
import HeroSearchBar from './HeroSearchBar'

export default function HomeHero() {
  return (
    <section className="relative w-full overflow-hidden rounded-3xl mb-10 sm:aspect-[16/9] sm:min-h-[320px] flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/hero-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-[75%_center]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10"
      />

      <div className="relative px-6 py-8 sm:px-12 sm:py-20 max-w-xl">
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

        {/* Barra de pesquisa "completa" (com sugestões) - vive só aqui no
            Hero, ver components/HeroSearchBar.tsx. Esconde-se sozinha
            quando a pesquisa compacta do cabeçalho está aberta, para nunca
            haver duas barras de pesquisa visíveis ao mesmo tempo. */}
        <HeroSearchBar />

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
