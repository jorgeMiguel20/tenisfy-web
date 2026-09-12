// components/HomeHero.tsx
import HomeHeroButtons from './HomeHeroButtons'

// Hero redesenhado (v2 do Jorge no Claude Design, foto 4/foto 2 do
// feedback): overlay mais escuro, etiqueta laranja em cima do titulo,
// segunda parte do titulo numa cor terracota mais suave (nao o laranja
// vivo do resto do site - pedido explicito do Jorge depois de comparar
// com o mockup, que usa um tom mais discreto), "€" decorativo semi
// transparente no canto superior direito (tal como no mockup), e os 2
// botoes de HomeHeroButtons.tsx no lugar da barra de pesquisa/atalhos
// "Populares" - a pesquisa por texto continua disponivel pelo icone de
// pesquisa no cabecalho.
export default function HomeHero() {
  return (
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden sm:min-h-[85vh] sm:max-h-[840px] flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/hero-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center sm:object-[75%_center]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/50"
      />
      {/* "€" decorativo, semi-transparente, canto superior direito - so
          visual, tal como no mockup v2 do Jorge. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 right-6 select-none font-display text-[8rem] sm:text-[11rem] font-bold leading-none text-white/10 sm:right-16"
      >
        €
      </span>

      {/* Imagem de fundo edge-to-edge, texto alinhado com o resto da pagina
          - ver app/page.tsx para a largura maxima e respiro lateral. */}
      <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-8 sm:py-20">
        <div className="max-w-xl">
          <div className="mb-4 flex items-center gap-2">
            <span aria-hidden="true" className="h-px w-6 bg-orange-500" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-orange-500">
              Preços verificados todos os dias
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Encontra o par certo. Ao preço certo.
          </h1>
          <p className="mt-4 text-white/80 text-lg max-w-md">
            Uma pesquisa, todas as lojas. Comparamos preço, stock e tamanhos para que pagues o menos possível pelo
            par que já querias.
          </p>

          <HomeHeroButtons />
        </div>
      </div>
    </section>
  )
}
