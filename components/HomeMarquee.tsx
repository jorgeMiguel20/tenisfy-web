// components/HomeMarquee.tsx
// Faixa de marcas reais do catalogo, em loop continuo - ideia do redesign
// que o Jorge preparou no Claude Design, adaptada para nunca listar marcas
// que nao estejam mesmo no catalogo (a lista vem de app/page.tsx, a partir
// dos produtos reais carregados no momento, nunca uma lista fixa/inventada).
export default function HomeMarquee({ brands }: { brands: string[] }) {
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
    <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden border-y border-gray-100 bg-white py-4">
      <div className="marquee-track flex w-max items-center gap-10">
        {items.map((name, i) => (
          <span key={`${name}-${i}`} className="text-sm font-bold uppercase tracking-wide text-gray-900">
            {name}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee-scroll 32s linear infinite;
        }
      `}</style>
    </div>
  )
}
