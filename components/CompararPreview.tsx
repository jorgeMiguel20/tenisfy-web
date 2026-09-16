// components/CompararPreview.tsx
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'
import ProductGallery from '@/components/ProductGallery'
import FavoriteButton from '@/components/FavoriteButton'

type GroupedOffer = {
  store: string
  price: number
}

// Mesma logica de agrupamento por loja (preco mais baixo por loja, so
// ofertas em stock e nao descontinuadas) ja usada em app/comparar/page.tsx -
// para o badge "Mais barato" bater certo com o que a pagina /comparar
// mostraria para os mesmos 2 produtos.
function groupOffers(offers: any[]): GroupedOffer[] {
  const inStock = (offers ?? []).filter((o) => o.in_stock && !o.discontinued_at)
  const grouped: Record<string, GroupedOffer> = {}

  for (const offer of inStock) {
    const storeName = offer.stores?.name ?? 'Loja'
    if (!grouped[storeName] || offer.price < grouped[storeName].price) {
      grouped[storeName] = { store: storeName, price: offer.price }
    }
  }

  return Object.values(grouped).sort((a, b) => a.price - b.price)
}

// Mesma formula do selo "-X%" do components/ProductCard.tsx (grelha do
// catalogo) - percentagem sobre uma descida de preco REAL (priceDrop, do
// historico de precos) ou, na falta dessa, a poupanca real entre lojas
// (savings). Nunca um "preco original"/"preco de referencia" inventado -
// isso nao existe nos nossos dados.
function getDropPercent(product: any): number | null {
  const lowestPrice = product.lowest_price
  const discount = product.priceDrop ?? product.savings
  if (!discount || lowestPrice == null) return null
  return Math.round((discount.amount / (lowestPrice + discount.amount)) * 100)
}

// Mesmas especificacoes tecnicas da pagina /comparar (material, sola, fecho,
// cor) - vem diretamente das colunas reais da tabela products (nunca
// inventadas). Sem "Ref": esse campo e mais util na pagina /comparar, aqui
// so interessam os atributos que ajudam a decidir entre os 2 pares.
const SPEC_DEFS = [
  { key: 'material', label: 'Material' },
  { key: 'sole_type', label: 'Sola' },
  { key: 'closure_type', label: 'Fecho' },
  { key: 'color', label: 'Cor' },
] as const

// Mostra 2 produtos reais do catálogo (escolhidos em app/page.tsx) como
// prévia da funcionalidade de Comparar — nunca dados de exemplo inventados.
// Layout em 2 colunas: bloco de texto/CTA fixo à esquerda, grelha de
// comparação (2 cartões) à direita - pedido explícito do Jorge com imagem
// de referência.
//
// Redesenho (2ª ronda, pedido do Jorge com nova imagem de referência):
// - Etiqueta "Comparar" deixou de ter qualquer contorno à volta (só texto),
//   e passou de azul a preta, para bater certo com a imagem enviada.
// - Botão "Ir para o Comparar" mais pequeno (px-5/py-2.5/text-sm ->
//   px-4/py-2/text-xs) e com um pequeno ícone de "comparar" antes do texto.
// - Imagem decorativa (public/marketing/comparar-deco.png, enviada pelo
//   Jorge) por baixo do botão, no desktop e no mobile (pedido do Jorge),
//   um pouco mais pequena no mobile para não empurrar as fotos para muito
//   mais baixo.
// - Fotos dos 2 ténis passaram a ter uma caixa cinza-clara à volta (como no
//   cartão da página /comparar) e o botão de favoritos real (mesmo
//   componente FavoriteButton usado no /catalogo e na página de produto -
//   não um coração decorativo à parte).
// - Selo "-X%" no canto (mesma fórmula e cor do card do catálogo,
//   components/ProductCard.tsx): usa uma descida de preço real
//   (priceDrop, do histórico de preços) ou a poupança real entre lojas
//   (savings) - nunca uma percentagem inventada a partir de um "preço
//   original" que não existe nos nossos dados. Por isso o selo só aparece
//   quando o produto tiver mesmo esse dado (pode não aparecer nos 2 lados).
export default function CompararPreview({ products }: { products: ProductWithPrice[] }) {
  if (products.length < 2) return null
  const [a, b] = products as any[]

  const cheapestPrices = [a, b]
    .map((p) => groupOffers(p.product_offers ?? [])[0]?.price ?? p.lowest_price ?? null)
    .filter((price): price is number => price != null)
  const cheapestPrice = cheapestPrices.length > 1 ? Math.min(...cheapestPrices) : null
  // Diferença entre os 2 preços, só quando temos os 2 (para o badge "Mais
  // barato" mostrar quanto se poupa, não só qual é mais barato).
  const priceDiff = cheapestPrices.length === 2 ? Math.abs(cheapestPrices[0] - cheapestPrices[1]) : null

  // So mostra uma linha de especificacao quando pelo menos um dos 2
  // produtos tem esse dado - e a mesma lista de linhas (pela mesma ordem)
  // que sai para os 2 cartoes, para as linhas ficarem sempre alinhadas
  // horizontalmente entre os dois, mesmo quando um deles nao tem o dado.
  const specRows = SPEC_DEFS.filter(({ key }) => a[key] || b[key])

  // max-w-5xl (era max-w-3xl) - a coluna de texto teve de crescer para o
  // titulo caber numa so linha, e isso so tinha espaco sem espremer os
  // cartoes se a seccao toda ficasse mais larga
  return (
    <section className="mb-16 sm:mb-20 max-w-5xl mx-auto rounded-2xl bg-[#f7f9f8] p-6 sm:p-10">
      {/* bg-[#f7f9f8] (era bg-[#faf7f2], um creme mais quente) - pedido do
          Jorge para o fundo desta seccao ficar mais claro e neutro, a bater
          certo com o tom da imagem de referencia que enviou (~#f7f8f7),
          em vez do creme quente que tinha antes. Continua a ser uma de 2
          seccoes com fundo levemente tingido, alternado com seccoes
          brancas, so para dar ritmo ao scroll. */}
      {/* gap-6 mantem-se no mobile (empilhado) - o espaco maior
          (sm:gap-40) e so a partir do ecra onde o texto e os cartoes ficam
          lado a lado, que era onde o Jorge achava que estava muito junto */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-40">
        {/* Coluna esquerda: etiqueta, titulo, texto e CTA - fixa, nao encolhe */}
        {/* sm:w-[340px] (era sm:w-52/208px) - largura minima para "Vê os
            ténis lado a lado" caber numa unica linha no tamanho de letra
            atual (pedido do Jorge) */}
        <div className="flex w-full flex-shrink-0 flex-col gap-2.5 sm:w-[340px]">
          {/* Etiqueta "Comparar" removida (pedido do Jorge) - o titulo já
              deixa claro do que se trata, e a letra do titulo aumentou
              (text-2xl/3xl -> text-3xl/4xl) para compensar o espaço e dar
              mais destaque a esta secção. */}
          <h2 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl">Vê os ténis lado a lado</h2>
          {/* Sem text-sm (era mais pequeno que o texto da Pesquisa por foto,
              que usa o tamanho base) - agora o paragrafo fica do mesmo
              tamanho que o da seccao vizinha. */}
          <p className="text-gray-500 leading-relaxed">
            Seleciona dois ténis e vê-os lado a lado, com preço, especificações e loja — sem abrir dez separadores.
          </p>
          {/* Botão mais pequeno (px-4/py-2/text-xs, era px-5/py-2.5/text-sm)
              e com ícone de "comparar" antes do texto - pedido do Jorge. */}
          <Link
            href="/comparar"
            className="mt-1 inline-flex w-fit items-center justify-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M8 3 4 7l4 4" />
              <path d="M4 7h16" />
              <path d="M16 21l4-4-4-4" />
              <path d="M20 17H4" />
            </svg>
            Ir para o comparar
          </Link>
          {/* Imagem decorativa enviada pelo Jorge - agora tambem no mobile
              (pedido do Jorge: "falta aplicares no mobile"), um pouco mais
              pequena do que no desktop para nao ocupar espaco a mais antes
              das fotos dos tenis.
              Tamanho aumentado outra vez (260/320px -> 340/420px) e o risco
              horizontal que a imagem original tinha foi cortado (pedido do
              Jorge: "aumenta os ténis e a frase", "tira o risco") - o
              ficheiro em si (comparar-deco.png) foi substituído por uma
              versão sem o risco e sem a margem em excesso à volta. */}
          <div className="mt-6 w-[340px] sm:w-[420px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marketing/comparar-deco.png"
              alt=""
              aria-hidden="true"
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Coluna direita: grelha de comparacao com os 2 cartoes */}
        <div className="flex-1">
          {/* Fotos dos 2 ténis, num grid a parte so para elas - o badge "vs"
              fica ancorado so a esta linha (nao ao cartao todo, texto e
              specs incluidos), para ficar mesmo junto as fotos e nao a
              flutuar a meio do cartao (pedido do Jorge, comparando com o
              mockup: cor preta e posicao junto as fotos).
              Caixa cinza-clara à volta de cada foto, selo "-X%" no canto
              esquerdo (quando há descida de preço real) e o botão de
              favoritos real no canto direito - pedido do Jorge com a
              imagem de referência, reaproveitando o mesmo padrão visual do
              cartão do catálogo (components/ProductCard.tsx). */}
          <div className="relative grid grid-cols-2 gap-4">
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold uppercase text-white shadow-md ring-2 ring-white"
            >
              vs
            </span>
            {[a, b].map((product) => {
              // Só a primeira foto: isto é uma prévia, não a galeria completa
              // (essa fica para a página /comparar) - uma imagem estática fica
              // mais limpa aqui do que um carrossel com setas e pontos.
              const firstImage = product.image_url ?? product.image_urls?.[0] ?? null
              const dropPercent = getDropPercent(product)
              return (
                <div key={product.id} className="relative rounded-2xl bg-gray-100 p-2">
                  <div className="absolute left-3 top-3 right-3 z-10 flex items-center justify-between">
                    {dropPercent != null ? (
                      <span className="rounded-md bg-[#1F5F58] px-2 py-1 text-xs font-bold text-white">
                        -{dropPercent}%
                      </span>
                    ) : (
                      <span />
                    )}
                    <FavoriteButton slug={product.slug} />
                  </div>
                  <ProductGallery
                    images={firstImage ? [firstImage] : []}
                    alt={product.model_name}
                    compact
                    imageBoxClassName="aspect-square"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              )
            })}
          </div>

          {/* Nome e preço: nome e preço passam a ser cada um a sua própria linha
            de grelha, partilhada pelas 2 colunas (mesma técnica das
            especificações mais abaixo). Sem isto, quando o nome de um
            produto ocupa 2 linhas e o do outro só 1 (ex.: "Gel-Kayano 14
            Black Pure Silver" vs "Ultraboost 5"), o preço ficava a
            alturas diferentes nas 2 colunas - o min-height sozinho não
            chegava, porque o problema era o nome, não o selo "Mais
            barato". */}
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            {[a, b].map((product) => (
              <div key={`name-${product.id}`}>
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{product.brands?.name}</p>
                <h3 className="mt-0.5 text-sm font-semibold text-gray-900">{product.model_name}</h3>
              </div>
            ))}
            {[a, b].map((product) => {
              const offers = groupOffers(product.product_offers ?? [])
              const lowestPrice = offers[0]?.price ?? product.lowest_price ?? null
              const isCheapest = cheapestPrice != null && lowestPrice === cheapestPrice

              return (
                <div key={`price-${product.id}`} className="flex flex-wrap items-center gap-1.5">
                  {lowestPrice != null ? (
                    <>
                      <p className="text-lg font-extrabold text-gray-900">{formatPrice(lowestPrice)}</p>
                      {isCheapest && (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                          Mais barato{priceDiff ? ` · -${formatPrice(priceDiff)}` : ''}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Sem oferta disponível</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Especificações: UMA SÓ grelha CSS com 2 colunas (em vez de 2
              colunas de texto empilhadas de forma independente) - assim
              cada característica (Material, Sola, Fecho, Cor) fica sempre
              à MESMA altura nas 2 colunas, mesmo quando um dos textos é
              bem mais comprido (ex.: a "Sola" do Gel-Kayano vs a da
              Ultraboost) - mesma técnica da tabela grande do /comparar.
              Envolvida numa caixa branca para o espaço entre linhas
              mostrar sempre branco a sério (não o fundo da secção) -
              pedido do Jorge, confirmado com exemplo.
              Cor das caixas: NÃO depende de os 2 produtos terem valores
              diferentes (era assim antes, mas o Jorge reparou que ficava
              inconsistente - ex.: "Fecho" branco só porque calhava de ser
              igual nos 2 ténis). Agora é uma regra fixa por posição da
              linha - 1ª/3ª/5ª linha (Material, Fecho, ...) cinza claro,
              2ª/4ª/6ª linha (Sola, Cor, ...) branco - para ficar sempre
              previsível e continuar a aplicar-se sozinha se aparecer mais
              alguma característica no futuro. */}
          {specRows.length > 0 && (
            <div className="mt-2 rounded-2xl bg-white p-1.5">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {specRows.flatMap(({ key, label }, rowIndex) => {
                  const rowBg = rowIndex % 2 === 0 ? 'bg-gray-100' : 'bg-white'
                  return [a, b].map((product) => (
                    <div
                      key={`${label}-${product.id}`}
                      className={`rounded-xl px-3 py-2 text-xs ${rowBg}`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide text-black">{label}</p>
                      <p className="mt-0.5 text-gray-800">{product[key] ?? '—'}</p>
                    </div>
                  ))
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
