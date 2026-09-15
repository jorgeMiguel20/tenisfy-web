// components/HomeHero.tsx
import HomeHeroButtons from './HomeHeroButtons'

// Hero redesenhado (v2 do Jorge no Claude Design, foto 4/foto 2 do
// feedback): overlay mais escuro, etiqueta em cima do titulo, e os 2
// botoes de HomeHeroButtons.tsx no lugar da barra de pesquisa/atalhos
// "Populares" - a pesquisa por texto continua disponivel pelo icone de
// pesquisa no cabecalho.
//
// Foto de fundo trocada a pedido do Jorge (parede de sneakers com
// modelo, licenca Unsplash - free para uso comercial) para comunicar
// melhor "muitas marcas, muitas lojas" logo na hero.
//
// Ajustes pedidos pelo Jorge depois de ver a foto no telemovel:
// - Secao ganhou uma altura minima tambem no mobile (antes so tinha
//   min-h a partir do breakpoint sm:).
// - Etiqueta "Preços verificados todos os dias" deixou de ser laranja
//   e passou a branca, para combinar com o resto do texto da hero.
// - "€" decorativo removido a pedido do Jorge.
//
// Recorte da foto atualizado outra vez a pedido do Jorge (queria ver
// "todos os tenis" da parede e o corpo dela, nao so a cara/ombros):
// public/marketing/hero-bg.jpg passou a ser um recorte bem mais alto
// da mesma foto original (praticamente a largura toda, desde o topo da
// parede ate as maos/anca dela - a opcao "2" que ele escolheu entre 3
// recortes reais mostrados), por isso a secao ficou consideravelmente
// mais alta em ambos os breakpoints (antes era uma tira larga e baixa,
// agora e quase quadrada) para nao cortar demasiado a foto nova.
export default function HomeHero() {
  return (
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden min-h-[80vh] max-h-[820px] sm:min-h-[90vh] sm:max-h-[1080px] flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/hero-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/50"
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
