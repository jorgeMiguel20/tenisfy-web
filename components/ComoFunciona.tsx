// components/ComoFunciona.tsx
// Secção "Como funciona" - três cartões lado a lado, cada um com uma foto
// vertical (4:5), o número do passo, o título e o texto.
//
// Substitui a versão antiga (fundo escuro com foto e lista de passos por
// cima), a pedido do Jorge: a ideia veio do Unsplash (3 cartões, cada um
// com a sua foto). As três fotos foram escolhidas pelo Jorge e pelo Claude
// para contarem a história do site, com luz natural e tons neutros para
// ficarem coerentes entre si:
//   01 - rapaz num banco junto ao mar a ver o telemóvel (pesquisar)
//   02 - duas mãos a levantar dois ténis diferentes (comparar)
//   03 - ténis acabados de sair da caixa, com a etiqueta ainda presa
//        (comprar - sem mostrar uma loja física, porque a compra é feita
//        no site da loja)
//
// Regras visuais do site: fundo branco, cantos retos, sem sombras, linhas
// de 1px em #17232B/10, rótulos de 11px em maiúsculas.
//
// Telemóvel: os cartões ficam lado a lado e deslizam com o dedo (pedido do
// Jorge - uns por baixo dos outros ocupavam 3 ecrãs). Cada cartão tem 85%
// da largura do ecrã, por isso o seguinte aparece cortado na margem
// direita e mostra que há mais para ver, sem setas nem bolinhas. O
// deslizar "encaixa" no início de cada cartão (snap). A partir de sm
// ficam os três em 3 colunas, sem deslizar.
const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'

const STEPS = [
  {
    title: 'Pesquisa por texto ou por foto',
    text: 'Escreve o modelo ou tira uma foto na rua. Os dois caminhos levam ao mesmo catálogo.',
    image: 'como-funciona-pesquisa',
  },
  {
    title: 'Compara preços entre lojas',
    text: 'Preço, stock e tamanhos de cada loja parceira na mesma página.',
    image: 'como-funciona-comparar',
  },
  {
    title: 'Compra onde já confias',
    text: 'Link direto para a loja com o preço mais baixo. Sem intermediários.',
    image: 'como-funciona-comprar',
  },
]

export default function ComoFunciona() {
  return (
    <section className="py-16 sm:px-6 sm:py-24">
      <p className={LABEL}>Como funciona</p>
      {/* Escala de títulos comum a todas as secções da homepage (32px no
          telemóvel, 44px no desktop, entrelinha 1,05, letras ligeiramente
          mais juntas). */}
      <h2 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B] sm:text-[44px]">
        <span className="block text-balance">Três passos.</span>
        <span className="block text-balance text-[#5C6770]">Zero separadores.</span>
      </h2>

      {/* -mx-6 px-6 no telemóvel: a faixa de cartões vai até às bordas do
          ecrã (o main tem px-6), mas o primeiro cartão continua alinhado
          com o título. Barra de deslocamento escondida. */}
      <ol className="-mx-6 mt-10 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 [scrollbar-width:none] sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 lg:gap-8 [&::-webkit-scrollbar]:hidden">
        {STEPS.map((step, i) => (
          <li key={step.title} className="w-[85%] shrink-0 snap-start sm:w-auto">
            {/* Fundo claro enquanto a foto carrega; foto decorativa (alt
                vazio) - o texto do cartão já diz tudo. */}
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-none bg-[#F9FBFC]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/marketing/${step.image}-1200.jpg`}
                srcSet={`/marketing/${step.image}-600.jpg 600w, /marketing/${step.image}-1200.jpg 1200w`}
                sizes="(min-width: 1280px) 400px, (min-width: 640px) 33vw, 85vw"
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="mt-5 border-t border-[#17232B]/10 pt-4">
              <p className={`${LABEL} tabular-nums`}>{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug text-[#17232B]">{step.title}</h3>
              <p className="mt-2 max-w-[24rem] text-[15px] leading-relaxed text-[#5C6770]">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
