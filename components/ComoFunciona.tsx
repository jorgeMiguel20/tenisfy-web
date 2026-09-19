// components/ComoFunciona.tsx
// Secao "Como funciona" redesenhada (fundo escuro com foto, estilo do
// redesign v2 que o Jorge preparou no Claude Design) - versao puramente
// descritiva, sem exemplo de produto real embutido: o exemplo real de
// precos por loja agora vive na sua propria seccao, ver
// components/DiferencaPrecos.tsx.
const STEPS = [
  {
    title: 'Pesquisa por texto ou por foto',
    text: 'Escreve o modelo ou tira uma foto na rua. Os dois caminhos levam ao mesmo catálogo.',
  },
  {
    title: 'Compara preços entre lojas',
    text: 'Preço, stock e tamanhos de cada loja parceira na mesma página.',
  },
  {
    title: 'Compra onde já confias',
    text: 'Link direto para a loja com o preço mais baixo. Sem intermediários.',
  },
]

export default function ComoFunciona() {
  return (
    // mb-12 (pedido do Jorge: reparou que esta seccao encostava direto na
    // seccao seguinte - "Alerta de preco inteligente" - sem qualquer
    // espaco entre as duas, ao contrario de todas as outras transicoes de
    // seccao na pagina, que tem sempre uma margem visivel)
    //
    // Décimo segundo ajuste: o Jorge pediu para mudar a cor do "Como
    // funciona" e dos números 01/02/03 (deixou a escolha ao meu critério).
    // Estavam a laranja (text-orange-500), a mesma cor usada como destaque
    // em quase todo o resto do site (hover dos links do cabeçalho, rótulo
    // "Pesquisa por foto", etc.) - por isso esta secção acabava por não se
    // distinguir visualmente das outras. Escolhido "emerald-300" (verde
    // menta claro): é a mesma família do verde de marca já usado noutro
    // sítio do site (#123F3A em DiferencaPrecos.tsx, "poupança" a
    // emerald-600/700 em ProductCard.tsx/ProductGrid.tsx), mas numa
    // tonalidade clara com bom contraste sobre a foto escura de fundo
    // (overlay preto a 75-90%) - dá uma identidade própria a esta secção
    // sem inventar uma cor nova fora da paleta da marca.
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden mb-12">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/step-buy.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/50"
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:grid-cols-2 sm:items-center sm:gap-16 sm:px-12 sm:py-24">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-emerald-300">Como funciona</span>
          <h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold leading-tight text-white">
            Três passos.
            <br />
            Zero separadores.
          </h2>
        </div>

        <div>
          {STEPS.map((step, i) => (
            <div key={step.title} className={`py-5 ${i > 0 ? 'border-t border-white/15' : ''}`}>
              <span className="text-xs font-bold text-emerald-300">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-1 text-base font-bold text-white">{step.title}</h3>
              <p className="mt-1 text-sm text-white/60">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
