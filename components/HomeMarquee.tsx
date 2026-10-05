// components/HomeMarquee.tsx
// Faixa de marcas reais do catalogo, em loop continuo - ideia do redesign
// que o Jorge preparou no Claude Design, adaptada para nunca listar marcas
// que nao estejam mesmo no catalogo (a lista vem de app/page.tsx, a partir
// dos produtos reais carregados no momento, nunca uma lista fixa/inventada).
//
// Faixa escura (#17232B, a cor do texto do site) com os nomes a branco, para
// dar contraste a uma homepage muito branca (pedido de marketing). Cada nome
// leva a pagina da marca (/marcas/nike...) - ajuda quem quer ver so uma
// marca e ajuda o Google a encontrar essas paginas. A animacao para quando
// se passa o rato por cima, para dar tempo de carregar no nome.
import Link from 'next/link'

export type MarqueeBrand = { name: string; slug: string }

export default function HomeMarquee({ brands }: { brands: MarqueeBrand[] }) {
  if (brands.length === 0) return null

  // Repete a lista de marcas o suficiente para o "bloco" ficar bem mais
  // largo do que qualquer ecra, mesmo quando o catalogo so tem poucas
  // marcas distintas (ex.: 5). Sem isto, um catalogo com poucas marcas
  // deixava um espaco em branco enorme a seguir a ultima marca, porque as
  // duas copias juntas nao chegavam a preencher a largura do ecra.
  const repeatCount = Math.max(1, Math.ceil(24 / brands.length))
  const block = Array.from({ length: repeatCount }, () => brands).flat()

  // Duplica o bloco para o loop de CSS ficar continuo (quando a primeira
  // copia sai do ecra a segunda ja esta la, sem salto visivel).
  const items = [...block, ...block]

  return (
    <nav
      aria-label="Marcas"
      className="marquee relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden bg-[#17232B] py-4"
    >
      <div className="marquee-track flex w-max items-center gap-10">
        {items.map((brand, i) => {
          // So a primeira volta da lista conta para leitores de ecra e para
          // o teclado (Tab) - as repeticoes sao so visuais.
          const isRepeat = i >= brands.length
          return (
            <Link
              key={`${brand.slug}-${i}`}
              href={`/marcas/${brand.slug}`}
              aria-hidden={isRepeat || undefined}
              tabIndex={isRepeat ? -1 : undefined}
              className="text-sm font-bold uppercase tracking-wide text-white/90 transition-colors hover:text-white focus-visible:text-white"
            >
              {brand.name}
            </Link>
          )
        })}
      </div>
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee-scroll 32s linear infinite;
        }
        .marquee:hover .marquee-track,
        .marquee:focus-within .marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
          }
        }
      `}</style>
    </nav>
  )
}
