// components/PesquisaPorFoto.tsx
import PesquisaPorFotoButton from './PesquisaPorFotoButton'

// Secção "Viste uns ténis na rua? Tira uma foto." da homepage.
//
// A funcionalidade real de pesquisa por foto já existe
// (app/api/search-by-image/route.ts, usada pelo modal unificado de pesquisa -
// ver components/SearchModal.tsx). Esta secção só a explica e abre-a.
//
// Redesenho (pedido do Jorge, com as regras visuais combinadas para não
// parecer "gerado por IA" - as mesmas do comparador e do alerta de preço):
// - Mesma grelha de 12 colunas, mesmo espaçamento vertical, mesma etiqueta
//   (11px, maiúsculas), mesmo título e mesmo botão verde #123F3A.
// - Foto do lado esquerdo no computador (o comparador e o alerta têm a foto
//   à direita), para as secções alternarem em vez de se repetirem. No
//   telemóvel o texto vem primeiro, como nas outras secções.
// - Foto nova enviada pelo Jorge: é a versão inteira e com mais resolução
//   da foto que já estava aqui. Corte 3:2 (igual ao alerta) com os ténis
//   verdadeiros desfocados em cima e a foto deles no ecrã do telemóvel -
//   conta a funcionalidade sem precisar de texto. O corte deixa de fora a
//   barra da câmara em polaco ("WIDEO / ZDJĘCIE") que aparece mais abaixo
//   na foto original.
// - Sem sombra e sem o escurecimento preto em baixo (tapava os ténis no
//   ecrã do telemóvel e não há texto por cima da foto).
// - A barra de "scanner" animada fica (pedido anterior do Jorge), mas mais
//   discreta: uma linha fina sem brilho à volta, e desligada para quem
//   pede menos animação no sistema (prefers-reduced-motion).
const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'

export default function PesquisaPorFoto() {
  return (
    <section className="py-16 sm:px-6 sm:py-24">
      <div className="grid gap-10 sm:grid-cols-12 sm:items-center sm:gap-12">
        <div className="sm:order-2 sm:col-span-5">
          <p className={LABEL}>Pesquisa por foto</p>
          <h2 className="mt-2 font-display text-[32px] sm:text-[44px] font-bold leading-[1.05] tracking-[-0.02em] text-[#17232B]">
            <span className="block text-balance">Viste uns ténis na rua?</span>
            <span className="block text-balance">Tira uma foto.</span>
          </h2>
          {/* Só o que a funcionalidade faz: procura no catálogo os ténis
              mais parecidos e mostra o preço; aceita fotos da câmara, da
              galeria e screenshots. */}
          <p className="mt-3 max-w-[24rem] text-base leading-relaxed text-[#5C6770]">
            Procuramos no nosso catálogo os ténis mais parecidos e mostramos-te o preço. Funciona com fotos da
            câmara, da galeria ou screenshots.
          </p>
          <div className="mt-6">
            <PesquisaPorFotoButton />
          </div>
        </div>

        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-none bg-[#F9FBFC] sm:order-1 sm:col-span-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marketing/pesquisa-foto-1366.jpg"
            srcSet="/marketing/pesquisa-foto-800.jpg 800w, /marketing/pesquisa-foto-1366.jpg 1366w"
            sizes="(max-width: 640px) 100vw, 58vw"
            alt="Telemóvel a fotografar um par de ténis"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Barra de scanner - puramente decorativa (aria-hidden). CSS
              puro via <style> para não depender de configuração extra do
              Tailwind. */}
          <div aria-hidden="true" className="pjt-scan absolute inset-0 overflow-hidden">
            <div className="pjt-scan-line absolute inset-x-0 -top-10 h-10" />
          </div>
          <style>{`
            @keyframes pjt-scan {
              0% { top: -2.5rem; }
              50% { top: 100%; }
              100% { top: -2.5rem; }
            }
            .pjt-scan-line {
              background: linear-gradient(
                to bottom,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0.18) 90%,
                rgba(255, 255, 255, 0.7) 100%
              );
              animation: pjt-scan 3.2s ease-in-out infinite;
            }
            @media (prefers-reduced-motion: reduce) {
              .pjt-scan { display: none; }
            }
          `}</style>
        </div>
      </div>
    </section>
  )
}
