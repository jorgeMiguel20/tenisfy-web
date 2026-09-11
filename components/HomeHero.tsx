// components/HomeHero.tsx
import Link from 'next/link'
import HeroSearchBar from './HeroSearchBar'

type PopularSearch = { label: string; href: string }

export default function HomeHero({ popularSearches = [] }: { popularSearches?: PopularSearch[] }) {
  return (
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden sm:aspect-[16/9] sm:min-h-[320px] sm:max-h-[440px] flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/hero-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center sm:object-[75%_center]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10"
      />

      {/* Imagem de fundo agora edge-to-edge (ocupa o ecra todo, sem faixas
          brancas nas laterais) - pedido do Jorge. O texto por cima continua
          alinhado com o resto da pagina (mesma largura maxima e respiro
          lateral de app/page.tsx aplicados aqui dentro), so a imagem de
          fundo e que "quebra" o contentor. */}
      <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-8 sm:py-20">
        <div className="max-w-xl">
          {/* Etiqueta "verificado todos os dias" - antes vivia so em baixo,
              ao lado da barra de pesquisa; sobe agora para cima do titulo
              como um pequeno selo de confianca. Ideia do redesign que o
              Jorge preparou no Claude Design, mantendo o resto do Hero tal
              como estava (sem mais laranja do que o que ja tinha). */}
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            Verificado todos os dias
          </span>
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

          {/* Atalhos para modelos reais com mais lojas comparaveis agora
              (nunca uma lista fixa/inventada - vem de app/page.tsx a partir
              do catalogo real). Ideia do redesign do Jorge no Claude
              Design, adaptada a dados verdadeiros. */}
          {popularSearches.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-white/60">Populares:</span>
              {popularSearches.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
