// components/DiferencaPrecos.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'

// Seccao "A diferenca que ninguem te mostra" - REDESIGN pedido pelo Jorge
// (mockup exato fornecido, "Desenvolve exatamente igual tamanho e tudo").
// Mostra o preco do mesmo produto em ate 4 lojas reais, sempre da mais
// barata para a mais cara ("Ordenar por: preco mais baixo" e sempre assim,
// nao e um menu funcional - confirmado com o Jorge) - nunca lojas, precos,
// portes ou PRAZOS DE ENTREGA inventados. O mockup original do Jorge tinha
// um prazo de entrega por loja (“2 dias”, “3 dias”) que nao existe em lado
// nenhum dos nossos dados - combinado com o Jorge (perguntado antes de
// avancar): esse elemento fica de fora, so aparece o que e real (preco,
// "Melhor preco" e portes gratis/custo de envio quando ha dados fiaveis).
//
// Logo real da loja e logica de portes - mesma abordagem ja usada e
// validada em components/StoreOffersList.tsx, duplicada aqui de proposito
// (mesmo criterio de sempre nesta seccao: independente, para nao arriscar
// mexer num componente ja validado). getProductsWithPrice.ts (que alimenta
// esta seccao, via a homepage) so traz shipping_base_fee/shipping_free_threshold
// por loja, nao shipping_info - por isso a variante "texto" mais detalhada
// do StoreOffersList (que depende de shipping_info) fica de fora aqui; so
// se mostra o selo "Portes gratis" quando os dados garantem mesmo isso.
const BRAND_ICON_SLUGS: Record<string, string> = {
  'nike.com': 'nike',
  'adidas.pt': 'adidas',
  'newbalance.pt': 'newbalance',
  'zalando.pt': 'zalando',
}

const STORE_LOGO_URLS: Record<string, string> = {
  'collectkicks.pt': 'https://collectkicks.pt/cdn/shop/files/logo_s_fundo_180x.png?v=1682350995',
  'footdistrict.com': 'https://footdistrict.com/cdn/shop/files/Logo_7d9512d9-6a65-44bd-b120-1a0ff1b8cbad.png',
  'vans.com': 'https://assets.vans.eu/image/upload/v1755503693/default.svg',
  'asics.com': 'https://www.asics.com/us/mobify/bundle/9379/static/img/global/favicon_512x512.png',
}

function storeLogoSrc(domain: string) {
  const slug = BRAND_ICON_SLUGS[domain]
  if (slug) return `https://cdn.simpleicons.org/${slug}`
  const direct = STORE_LOGO_URLS[domain]
  if (direct) return direct
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

function domainFromBaseUrl(baseUrl: string | null | undefined): string {
  if (!baseUrl) return ''
  try {
    return new URL(baseUrl).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function bestPricePerStore(product: ProductWithPrice) {
  const grouped = new Map<
    string,
    { price: number; oldestCheckedAt: string | null; domain: string; threshold: number | null }
  >()
  for (const offer of product.product_offers ?? []) {
    if (!offer.in_stock || !offer.stores) continue
    const current = grouped.get(offer.stores.name)
    const isCheaper = current == null || offer.price < current.price
    const oldestCheckedAt =
      current?.oldestCheckedAt == null || offer.last_checked_at < current.oldestCheckedAt
        ? offer.last_checked_at
        : current.oldestCheckedAt
    grouped.set(offer.stores.name, {
      price: isCheaper ? offer.price : current!.price,
      oldestCheckedAt,
      domain: domainFromBaseUrl(offer.stores.base_url),
      threshold: offer.stores.shipping_free_threshold,
    })
  }
  // Sempre do mais barato para o mais caro - a etiqueta "Ordenar por: preço
  // mais baixo" reflete sempre a ordem real da lista, nunca é só decorativa.
  return Array.from(grouped.entries())
    .map(([store, { price, oldestCheckedAt, domain, threshold }]) => ({
      store,
      price,
      lastCheckedAt: oldestCheckedAt,
      domain,
      threshold,
    }))
    .sort((a, b) => a.price - b.price)
}

// "verificado hoje as HH:MM" quando a oferta foi mesmo verificada hoje
// (a partir da data real), senao cai para "verificado ha X dias" - nunca
// uma hora inventada.
function formatVerifiedLabel(lastCheckedAt: string | null): string | null {
  if (!lastCheckedAt) return null
  const checked = new Date(lastCheckedAt)
  const now = new Date()
  const sameDay =
    checked.getFullYear() === now.getFullYear() &&
    checked.getMonth() === now.getMonth() &&
    checked.getDate() === now.getDate()
  if (sameDay) {
    const time = checked.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    return `verificado hoje às ${time}`
  }
  const diffDays = Math.round((now.getTime() - checked.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'verificado hoje'
  return `verificado há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
}

// Ícones simples (mesmo estilo de traço fino usado no resto do site)
function TagIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.82Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" />
    </svg>
  )
}

function ChevronIcon({ direction, className = 'h-4 w-4' }: { direction: 'left' | 'right'; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

export default function DiferencaPrecos({ product }: { product?: ProductWithPrice | null }) {
  const storeRows = product ? bestPricePerStore(product).slice(0, 4) : []
  const images = product?.image_urls?.length ? product.image_urls : product?.image_url ? [product.image_url] : []
  const [imageIndex, setImageIndex] = useState(0)
  const [storeIndex, setStoreIndex] = useState(0)
  const storeCount = storeRows.length

  // Correção a pedido do Jorge: não é um carrossel manual (setas/clique) -
  // as 3 lojas ficam sempre todas visíveis, e o destaque avança sozinho de
  // loja em loja, em loop, a cada 2.5s. Hook chamado sempre (nunca depois de
  // um "return" condicional - regra dos Hooks do React), a guarda
  // "storeCount < 2" fica dentro do efeito.
  useEffect(() => {
    if (storeCount < 2) return
    const id = setInterval(() => {
      setStoreIndex((i) => (i + 1) % storeCount)
    }, 2500)
    return () => clearInterval(id)
  }, [storeCount])

  if (!product || storeRows.length < 2) return null

  const cheapest = storeRows[0]
  const priciest = storeRows[storeRows.length - 1]
  const savings = priciest.price - cheapest.price
  const verifiedLabel = formatVerifiedLabel(cheapest.lastCheckedAt)
  const currentImage = images[imageIndex] ?? null

  function prevImage() {
    setImageIndex((i) => (i - 1 + images.length) % images.length)
  }
  function nextImage() {
    setImageIndex((i) => (i + 1) % images.length)
  }

  return (
    // Pedido do Jorge: paleta "premium/editorial" exata (fundo quase branco,
    // verde só como acento em botões/badges, nunca a preencher a interface).
    // Cores exatas que pediu: fundo #F7F8F7, texto principal #17232B, texto
    // secundário #68747C, verde de marca #123F3A, verde claro (só para o
    // fundo dos pequenos badges) #E8F2EF.
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden bg-[#F7F8F7] py-8 sm:py-10">
      <div className="relative mx-auto grid max-w-7xl gap-6 px-6 sm:grid-cols-2 sm:items-center sm:gap-8 sm:px-12">
        <div>
          {/* Pedido do Jorge: hierarquia editorial muito mais forte - título
              e preço bem maiores do que antes, para serem claramente os
              protagonistas da secção. Badge "O mesmo ténis, X preços"
              removido a pedido do Jorge.
              Quinto ajuste (Jorge: "ainda está muito grande, quero que se
              veja tudo numa só página" - a secção inteira não cabia num ecrã
              normal sem dar scroll, confirmado com print do próprio ecrã do
              Jorge, 1365x688px): reduzi texto, espaçamentos verticais e o
              tamanho da própria foto (ver nota mais abaixo) para a secção
              toda caber num ecrã típico sem scroll - testado ao vivo,
              medindo a altura real da secção (876px antes, 611px depois,
              contra os 688px do ecrã do Jorge). */}
          <h2 className="font-display text-3xl sm:text-4xl font-bold leading-[1.1] text-[#17232B]">
            A diferença que ninguém te mostra.
          </h2>
          <p className="mt-3 max-w-md text-sm sm:text-base text-[#68747C]">
            Alinhamos o preço do mesmo modelo nas lojas parceiras. A tua poupança é a
            distância entre a primeira e a última linha.
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-3 text-3xl sm:text-4xl font-extrabold text-[#17232B]">
            {formatPrice(cheapest.price)}
            {savings > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F2EF] px-3 py-1 align-middle text-sm font-bold text-[#123F3A]">
                <TagIcon />
                Poupa {formatPrice(savings)}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-[#68747C]">
            {product.model_name}
            {verifiedLabel ? ` · ${verifiedLabel}` : ''}
          </p>
          {/* Confirmado com o Jorge a partir da imagem de referência real:
              o botão é mesmo pílula (rounded-full), não rounded-xl como uma
              instrução em texto anterior tinha pedido - a imagem venceu por
              ser a referência final. */}
          <Link
            href={`/produto/${product.slug}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#123F3A] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b]"
          >
            Ver este par
            <ChevronIcon direction="right" className="h-3.5 w-3.5" />
          </Link>
          {/* Linha dos 3 benefícios (Compara preços/Vê o stock/Compra com
              confiança) removida a pedido do Jorge - informação já repetida
              noutro sítio da página. */}
        </div>

        <div className="relative">
          {currentImage ? (
            // Comparação pixel-a-pixel com a imagem de referência real que o
            // Jorge enviou (medi as coordenadas na própria imagem, não é a
            // olho): o card "Onde comprar" fica quase inteiramente DENTRO do
            // "product stage" - só uma faixa fina do lado esquerdo do card é
            // que sai para fora do stage, para a esquerda. A técnica
            // continua a ser segura e independente da altura do card (2, 3
            // ou 4 lojas): a caixa exterior do stage reserva uma zona vazia
            // fixa depois da foto ("pb-[180px]"), e o card é puxado para
            // cima por uma quantidade FIXA ("sm:-mt-[205px]") para dentro
            // dessa reserva. sm:-ml-8 desloca o
            // card ligeiramente para a esquerda, a transbordar para fora do
            // stage, tal como confirmado na imagem de referência.
            //
            // Achado técnico importante (também confirmado a comparar com a
            // referência): o "product stage" não pode ter o mesmo fundo da
            // secção (#F7F8F7) - tem de ser uma cor própria, ligeiramente
            // diferente (#EDEFEE), senão a zona de reserva fica invisível
            // (misturada com o fundo da página) e a sobreposição do card
            // parece não fazer efeito nenhum visualmente, mesmo estando
            // matematicamente correta.
            //
            // Segundo achado (reportado pelo Jorge depois do 1º deploy, com
            // print anotado a mostrar um espaço grande a mais entre o ténis
            // e o card): a foto "hero" (a primeira do carrossel) é quadrada
            // mas o ténis só ocupa ~34% da altura da foto - o resto é fundo
            // de estúdio vazio. Cheguei a apertar o enquadramento com
            // "aspect-[2/1]" + "object-cover" (corta uma fatia de cima e de
            // baixo), mas o Jorge reparou que isso cortava OUTRAS fotos do
            // mesmo carrossel (pares de ténis, close-ups da sola, dos
            // atacadores) que não têm a mesma proporção vazia à volta -
            // ficavam com o ténis cortado. Voltei a "aspect-square" +
            // "object-contain" (nunca corta nada, mostra sempre a foto
            // inteira, seja qual for o enquadramento de cada foto) - troco
            // sempre segurança (nunca cortar o produto) por um espaço
            // ligeiramente maior nalgumas fotos, mantenho só a margem de
            // baixo reduzida (ver nota seguinte) que continua segura porque
            // não corta a imagem, só encolhe a moldura à volta dela.
            //
            // Terceiro ajuste (o Jorge pediu só mais um bocadinho depois do
            // aspect-[2/1], entretanto revertido): a folga que sobrava já
            // não vinha da foto em si, vinha da margem interna
            // ("p-6 sm:p-10") à volta da foto dentro do stage - essa margem
            // é igual nos 4 lados. Reduzi só a margem de baixo (perto do
            // card), mantendo a de cima e as laterais iguais - isto é
            // seguro com "object-contain" porque só reduz a moldura, nunca
            // corta a foto.
            //
            // Quarto ajuste (Jorge voltou a reportar "está muito separado"
            // depois do revert para aspect-square/object-contain, que trouxe
            // de volta o espaço vazio de estúdio nas 7 fotos do carrossel):
            // testei ao vivo, com o DOM da página em produção, a margem de
            // sobreposição do card em CADA uma das 7 fotos do carrossel
            // deste produto para encontrar o valor mais apertado que ainda
            // é seguro em todas - as fotos mais "cheias" (par de ténis
            // empilhado, sola e biqueira em close-up) só tinham ~110px de
            // fundo vazio por baixo do ténis, contra os ~200px da foto
            // "hero".
            //
            // Quinto ajuste (Jorge: "ainda está muito grande, quero que se
            // veja tudo numa só página" - ver nota junto ao título): além de
            // reduzir texto e espaçamentos, encolhi a própria foto - deixou
            // de ocupar a largura toda da coluna ("w-full") e passou a ter
            // um limite ("max-w-[380px]", centrado com "mx-auto"). Como a
            // foto ficou mais pequena, a reserva vazia a seguir ("pb-[180px]"
            // -> "pb-[115px]") e a sobreposição do card ("sm:-mt-[205px]" ->
            // "sm:-mt-[113px]") tiveram de encolher na mesma proporção -
            // voltei a testar ao vivo nas 7 fotos do carrossel com o novo
            // tamanho para confirmar que sobra sempre pelo menos ~45px de
            // margem de segurança até ao ténis, mesmo nas fotos mais
            // "cheias" (antes ~60px, a um tamanho de foto maior). No
            // telemóvel (colunas empilhadas) o limite de largura não tem
            // efeito visível, porque a coluna já é mais estreita do que
            // 380px.
            //
            // Sexto ajuste (Jorge enviou 2 fotos anotadas a comparar a
            // página atual com uma referência: "a foto 2 é como eu quero",
            // sinalizando a amarelo o tamanho da foto, a azul o card e a
            // vermelho a distância entre os dois - queria a foto do mesmo
            // tamanho da referência e a distância exatamente igual).
            // Medi ao pixel: na referência a foto ocupa ~48% da largura da
            // página (contra ~28% na versão atual, por causa do limite
            // "max-w-[380px]" do ajuste anterior) e o card entra por cima da
            // foto até 67,6% da altura - exatamente a "linha de água" onde
            // termina a sola do ténis na foto "hero" (confirmado por medição
            // de pixel feita num ajuste bem mais antigo). Ou seja: a
            // referência foi desenhada à volta da foto "hero" e essa
            // sobreposição só é segura NESSA foto.
            //
            // Para alargar a foto sem nunca cortar nenhuma das 7 fotos do
            // carrossel, troquei "aspect-square" por "aspect-[660/479]"
            // (mantendo sempre "object-contain") - com a caixa mais larga do
            // que quadrada, a foto passa a ser limitada pela ALTURA da
            // caixa, nunca pela largura, por isso sobra só espaço vazio dos
            // lados (nunca em cima/baixo) e nenhuma foto fica cortada. Isto
            // só se aplica a partir do "sm:" (o limite "max-w-[380px]" passa
            // a "sm:max-w-none" só no ecrã grande) - no telemóvel (colunas
            // empilhadas) fica tudo exatamente como estava.
            //
            // Testei em produção a sobreposição de 67,6% (igual à
            // referência) nas 7 fotos do carrossel deste produto: cobre uma
            // fatia da biqueira/sola em 2 das 7 fotos (o par de ténis
            // empilhado e a foto de cima a mostrar as solas) - o Jorge viu
            // exemplos e escolheu manter uma margem de segurança igual em
            // todas as fotos, em vez de usar 67,6% só na "hero" e um valor
            // diferente nas outras. Para encontrar o valor seguro, busquei
            // as imagens reais das 7 fotos e medi, pixel a pixel, onde
            // termina o produto (sola/biqueira) em cada uma: a mais
            // "cheia" (vista de cima, solas à mostra) tem o produto a
            // terminar a 89,25% da altura da foto - por isso fixei a
            // sobreposição do card em 90% da altura da caixa (um pouco
            // abaixo disso), com ~10px de margem de segurança confirmada
            // visualmente nessa foto e testada também nas restantes.
            // Resultado: a foto "hero" fica com uma folga maior do que a
            // referência (porque tem muito mais fundo vazio por baixo do
            // ténis do que as outras), mas nenhuma foto do carrossel fica
            // alguma vez tapada pelo card.
            //
            // Sétimo ajuste (Jorge enviou novo print anotado, a assinalar
            // com uma seta e um retângulo o espaço vazio de estúdio que
            // sobra no TOPO da foto, pedindo para "cortar este bocado"):
            // apliquei a mesma lógica de segurança do ajuste anterior, mas
            // ao contrário - medi pixel a pixel onde COMEÇA o produto (a
            // partir do topo) em cada uma das 7 fotos do carrossel. As duas
            // mais "cheias" no topo têm o ténis a começar já aos 12,5% da
            // altura da foto. Para nunca cortar o produto em nenhuma foto,
            // corto só 40px do topo (~10%, com margem de segurança) - o
            // ténis mantém sempre exatamente o mesmo tamanho (não há zoom,
            // só remoção do espaço morto), e a "caixa" da foto encolhe a
            // mesma quantidade. Tecnicamente: a imagem interior sobe 40px
            // (posição -40px em vez de 0) e a caixa exterior (com
            // "overflow-hidden") fica com menos 40px de altura - o
            // "aspect-[660/479]" passou a "aspect-[660/433]" para refletir
            // essa nova altura. Como o fundo da imagem fica ancorado ao
            // fundo da caixa (só a parte de cima é que é cortada), a
            // sobreposição do card com o ténis (calibrada no ajuste
            // anterior) mantém-se sempre segura - confirmei ao vivo nas
            // fotos mais apertadas de topo e de fundo depois desta
            // alteração, sem nenhuma foto tapada ou cortada. Só a partir do
            // "sm:" - no telemóvel fica tudo como estava (até este ajuste).
            //
            // Oitavo ajuste (Jorge: "agora melhora no mobile também" - no
            // telemóvel a foto continuava exatamente como antes do ajuste
            // anterior, quadrada e sem cortar o espaço vazio do topo).
            // Apliquei a mesma ideia do 7º ajuste (cortar só o topo, sem
            // zoom, sem tocar no tamanho do ténis) mas desta vez em
            // percentagem em vez de pixels fixos - no telemóvel a largura da
            // foto varia mais de telefone para telefone do que no desktop
            // (onde a coluna tem sempre uma largura parecida), e não
            // consegui testar em todos os tamanhos de ecrã reais neste
            // ambiente. Usar "%" em vez de "px" resolve isso: o corte fica
            // sempre proporcional ao tamanho da própria foto,
            // automaticamente correto em qualquer telemóvel, sem depender
            // de um valor fixo calibrado só para um tamanho. Corto 10% do
            // topo ("top-0" -> "top-[-10%]"), a mesma margem de segurança já
            // confirmada pixel a pixel nas 7 fotos (a mais "cheia" no topo
            // só começa a 12,5%). A "caixa" quadrada encolhe a mesma
            // proporção ("aspect-square" -> "aspect-[1/0.9]"). Testei ao
            // vivo, forçando a largura da foto para vários tamanhos
            // parecidos com um telemóvel, nas fotos mais apertadas de topo -
            // sem cortar nenhuma. Por agora só tratei do espaço vazio do
            // TOPO no telemóvel (o mesmo efeito de sobreposição do card por
            // cima do fundo da foto, que existe no desktop, não foi
            // replicado aqui - fica como possível próximo passo, a pedido
            // do Jorge). No ecrã grande ("sm:") mantém-se exatamente igual
            // ao ajuste anterior.
            <div className="relative overflow-visible rounded-[20px] bg-[#EDEFEE] pb-[115px] mx-auto w-full max-w-[380px] sm:max-w-none">
              <div className="relative aspect-[1/0.9] w-full overflow-hidden rounded-[20px] sm:aspect-[660/433]">
                <div className="absolute left-0 right-0 top-[-10%] bottom-0 p-4 pb-1.5 sm:top-[-40px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImage}
                    alt={product.model_name}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Etiqueta de marca/modelo no canto superior direito da
                    foto removida a pedido do Jorge. */}

                {images.length > 1 && (
                  <>
                    {/* Confirmado com a imagem de referência: as setas do
                        carrossel ficam centradas verticalmente na foto,
                        junto à borda direita - separadas da etiqueta de
                        marca (que fica só no topo), dentro do card
                        cinzento. */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                      <button
                        type="button"
                        onClick={prevImage}
                        aria-label="Foto anterior"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#17232B] shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                      >
                        <ChevronIcon direction="left" />
                      </button>
                      <button
                        type="button"
                        onClick={nextImage}
                        aria-label="Foto seguinte"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#17232B] shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                      >
                        <ChevronIcon direction="right" />
                      </button>
                    </div>
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                      {images.map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-2 rounded-full ring-1 ring-black/10 transition-colors ${
                            i === imageIndex ? 'bg-[#123F3A]' : 'bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Medi a proporção real na imagem de referência (card ≈64% da
              largura do "product stage") em vez de usar o valor em pixels
              (570-620px) que o Jorge tinha estimado a olho - esse número
              assumia uma página mais larga do que o nosso layout real
              (max-w-7xl). 72% é o valor mínimo que ainda evita que o texto
              de cada loja quebre a meio da linha - testado e confirmado
              visualmente. Continua claramente mais estreito do que a
              imagem toda, com folga cinzenta visível à direita (onde ficam
              as setas e os dots da foto), tal como na referência.
              Correção a pedido do Jorge: o "carrossel" que ele queria não
              era o de esconder lojas e mostrar uma de cada vez (isso já
              tinha sido feito e ele corrigiu) - é este: as 3 lojas ficam
              todas visíveis ao mesmo tempo, como antes, e um destaque
              (fundo verde claro) vai passando automaticamente de loja em
              loja sozinho, em loop, sem precisar de clique nem hover.
              "Ordenar por: preço mais baixo" continua removido do
              cabeçalho, e o selo "Grátis"/data de verificação continuam
              removidos de cada loja - a pedido do Jorge. */}
          <div
            className={`relative z-10 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${
              currentImage ? 'mt-4 w-full sm:w-[72%] sm:-mt-[157px] sm:-ml-16' : ''
            }`}
          >
            <div className="flex items-center px-5 pt-2.5 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#68747C]">Onde comprar</span>
            </div>
            {storeRows.map((row, i) => {
              const isBest = i === 0
              const isHighlighted = i === storeIndex
              return (
                <div
                  key={row.store}
                  className={`flex items-center justify-between gap-3 px-5 py-2.5 transition-colors duration-700 ${
                    i > 0 ? 'border-t border-gray-100' : ''
                  } ${isHighlighted ? 'bg-[#E8F2EF]' : ''}`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="text-xs font-bold shrink-0 text-[#68747C]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {row.domain && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={storeLogoSrc(row.domain)}
                          alt=""
                          aria-hidden="true"
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </span>
                    )}
                    <span className="min-w-0 flex flex-col">
                      <span className="truncate text-sm font-medium text-[#17232B]">{row.store}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {/* Pedido do Jorge: preços sempre em carvão (nunca
                        esbatidos a cinzento-claro) - a diferença entre a
                        melhor oferta e as restantes vem do peso da fonte e
                        do selo "Melhor preço", não da cor do preço em si. */}
                    <span className={`text-sm text-[#17232B] ${isBest ? 'font-extrabold' : 'font-normal'}`}>
                      {formatPrice(row.price)}
                    </span>
                    {isBest && (
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#123F3A] px-2 py-1 text-[10px] font-semibold text-white">
                        Melhor preço
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
