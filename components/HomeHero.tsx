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
// Recorte da foto atualizado a pedido do Jorge (queria ver "todos os
// tenis" da parede e o corpo dela): public/marketing/hero-bg.jpg e um
// recorte quase quadrado (1600x1538) da mesma foto original, desde o
// topo da parede ate as maos/anca dela.
//
// Altura da secao: no mobile mantem-se por vh (ocupa quase o ecra
// todo, so corta um pouco os lados da foto - fica bem porque o ecra de
// telemovel ja e estreito/alto, parecido com a foto). No desktop
// (sm:) o ecra e muito mais largo que alto, e um limite em vh cortava
// a foto a meio do peito sem chegar a mostrar as maos - o Jorge pediu
// para ver a foto toda em vez disso, por isso a partir do sm: a altura
// passa a ser calculada pela propria proporcao da foto (aspect-ratio),
// sem limite de altura - a secao fica mais alta do que um ecra normal
// e o visitante desce um pouco para ver o resto, mas nada da foto e
// cortado.
//
// Overlay escurecido: com esta foto (fundo branco/claro), o overlay
// preto que tinhamos (90/75/50) ficava pesado demais e escurecia a
// foto toda - o Jorge reparou que estava "muito escura". Aligeirado
// para 80/50/15 - mantem legibilidade do texto do lado esquerdo (mais
// escuro) e deixa a foto respirar do lado direito (bem mais claro).
export default function HomeHero() {
  return (
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden min-h-[80vh] max-h-[820px] sm:min-h-0 sm:max-h-none sm:aspect-[1600/1538] flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/hero-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
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
