// components/HomeHero.tsx
import HomeHeroButtons from './HomeHeroButtons'

// Hero redesenhado (v2 do Jorge no Claude Design, foto 4/foto 2 do
// feedback): overlay em cima do titulo, e os 2 botoes de
// HomeHeroButtons.tsx no lugar da barra de pesquisa/atalhos
// "Populares" - a pesquisa por texto continua disponivel pelo icone de
// pesquisa no cabecalho.
//
// Foto de fundo trocada a pedido do Jorge (parede de sneakers com
// modelo, licenca Unsplash - free para uso comercial) para comunicar
// melhor "muitas marcas, muitas lojas" logo na hero.
//
// Ajustes pedidos pelo Jorge depois de ver a foto no telemovel:
// - Secao ganhou uma altura minima tambem no mobile.
// - Etiqueta "Preços verificados todos os dias" deixou de ser laranja
//   e passou a branca.
// - "€" decorativo removido.
//
// DUAS fotos de fundo diferentes, uma por tamanho de ecra (pedido do
// Jorge depois de varias tentativas com uma unica foto):
// - Mobile (public/marketing/hero-bg.jpg, 1600x1538, quase quadrada):
//   mostra da parede toda ate as maos/anca dela. No telemovel o ecra e
//   estreito/alto, por isso o object-cover so corta um pouco dos
//   lados e mostra a foto quase toda - o Jorge confirmou que "esta
//   perfeito", por isso NAO MEXER aqui.
// - Desktop (public/marketing/hero-bg-desktop.jpg, 1920x1086, bem mais
//   larga): um recorte diferente da mesma foto original, da cabeca ate
//   as maos dela mas com a largura toda da parede de tenis. A foto
//   quase quadrada do mobile, num ecra de computador (largo e baixo),
//   obrigava a hero a ficar mais alta do que 2 ecras - o titulo nem
//   aparecia sem fazer scroll, e a meio do scroll via-se so os botoes
//   cortados no topo. Com este recorte mais "deitado" (perde so as 2
//   filas de tenis que estavam acima da cabeca dela, o resto mantem-se
//   todo), a hero volta a caber praticamente num ecra normal, sem
//   scroll estranho.
//
// Overlay escurecido: com esta foto (fundo branco/claro), o overlay
// preto que tinhamos antes (90/75/50) ficava pesado demais. Aligeirado
// para 80/50/15 - mantem legibilidade do texto do lado esquerdo e
// deixa a foto respirar do lado direito.
export default function HomeHero() {
  return (
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden min-h-[80vh] max-h-[820px] sm:min-h-0 sm:max-h-none sm:aspect-[1920/1086] flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/hero-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center sm:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/hero-bg-desktop.jpg"
        alt=""
        aria-hidden="true"
        className="hidden sm:block absolute inset-0 w-full h-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/15"
      />

      {/* Imagem de fundo edge-to-edge, texto alinhado com o resto da pagina
          - ver app/page.tsx para a largura maxima e respiro lateral. */}
      <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-8 sm:py-20">
        <div className="max-w-xl">
          <div className="mb-4 flex items-center gap-2">
            <span aria-hidden="true" className="h-px w-6 bg-white/60" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-white">
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
