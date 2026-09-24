// components/PriceAlertBanner.tsx
import Link from 'next/link'
import PriceAlertButton from './PriceAlertButton'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'

// Secção "Tu defines o preço. Nós avisamos quando descer." da homepage.
//
// Redesenho (pedido do Jorge, com mockup próprio de referência e as regras
// visuais combinadas para não parecer "gerado por IA"):
// - Deixou de ser um cartão com cantos redondos e sombra dentro da página:
//   fundo branco, cantos retos, linhas de 1px - como o comparador.
// - Saíram a animação de 3 passos, o sino amarelo, as pílulas "100% grátis"
//   / "24/7", os pontos de carrossel e o email de exemplo: muitos elementos
//   de "interface falsa" a competir entre si.
// - À direita fica uma foto real do ténis usado como exemplo e, por baixo,
//   uma linha simples com o modelo, o preço atual (real, da base de dados)
//   e um preço alvo de EXEMPLO (ver exampleTarget) - assinalado como exemplo, nunca
//   apresentado como um alerta real de alguém.
// - Texto corrigido para dizer só o que é verdade: os preços são
//   verificados todos os dias (não "24/7") e o email chega quando uma
//   verificação encontra um preço abaixo do valor escolhido.
//
// A foto só é usada quando é mesmo do produto mostrado (ver app/page.tsx,
// "lifestyleImage"); se o produto do exemplo mudar, cai para a foto de
// catálogo desse produto.
const LINE = 'border-[#17232B]/10'
const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'

// Preço alvo de EXEMPLO mostrado no cartão (pedido do Jorge: "abaixo de
// 100 €"). Quem cria um alerta escolhe normalmente um valor redondo, por
// isso, quando o preço atual está entre ~105 € e ~133 €, o exemplo passa a
// ser 99,99 € (entre 5% e 25% abaixo - um desconto plausível, não
// exagerado). Fora desse intervalo (se o produto do exemplo mudar), volta
// à regra anterior: 10% abaixo do preço atual.
const ROUND_TARGET = 99.99

function exampleTarget(current: number): number {
  if (current * 0.75 <= ROUND_TARGET && ROUND_TARGET <= current * 0.95) return ROUND_TARGET
  return Math.max(1, Math.round(current * 0.9 * 100) / 100)
}

export type AlertLifestyleImage = {
  src: string
  srcSet: string
}

export default function PriceAlertBanner({
  product,
  lifestyleImage = null,
}: {
  product: ProductWithPrice | null
  lifestyleImage?: AlertLifestyleImage | null
}) {
  if (!product || product.lowest_price == null) return null

  const catalogImage = product.image_url ?? product.image_urls?.[0] ?? null
  const current = product.lowest_price
  const target = exampleTarget(current)
  const brand = product.brands?.name ?? ''
  const name = `${brand} ${product.model_name}`.trim()

  return (
    <section className="py-16 sm:px-6 sm:py-24">
      <div className="grid gap-10 sm:grid-cols-12 sm:items-center sm:gap-12">
        <div className="sm:col-span-5">
          <p className={LABEL}>Alerta de preço</p>
          <h2 className="mt-2 font-display text-[32px] sm:text-[44px] font-bold leading-[1.05] tracking-[-0.02em]">
            <span className="block text-balance text-[#17232B]">Tu defines o preço.</span>
            <span className="block text-balance text-[#5C6770]">Nós avisamos quando descer.</span>
          </h2>
          {/* Texto curto (como nas páginas de referência do Jorge: Nike, BSTN)
              e só com o que é verdade: os preços são verificados uma vez por
              dia, não "24/7". */}
          <p className="mt-3 max-w-[24rem] text-base leading-relaxed text-[#5C6770]">
            Escolhe quanto queres pagar. Verificamos as lojas todos os dias e avisamos-te por email
            quando o preço baixar.
          </p>
          {/* O botão cria o alerta para o ténis mostrado à direita (é esse o
              produto que o PriceAlertButton recebe) - por isso o texto diz
              "este par", em vez de prometer "qualquer ténis". Para outro
              modelo, o link ao lado leva ao catálogo, onde cada ténis tem o
              seu próprio botão de alerta. */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <PriceAlertButton
              productId={product.id}
              currentPrice={product.lowest_price}
              variant="large"
              imageUrl={catalogImage}
              brandName={brand}
              modelName={product.model_name}
              label="Criar alerta para este par"
            />
            <Link
              href="/catalogo"
              prefetch={false}
              className="text-sm font-semibold text-[#17232B] underline decoration-[#17232B]/30 underline-offset-4 transition-colors hover:decoration-[#17232B]"
            >
              Escolher outro ténis
            </Link>
          </div>
          {/* Só o que é verdade: não é preciso conta (só o email) e o alerta
              termina sozinho ao fim de 1 ou 2 meses (escolha feita no próprio
              alerta - ver PriceAlertButton.tsx / priceAlertActions.ts). */}
          <p className="mt-4 text-sm text-[#5C6770]">Grátis e sem registo. O alerta termina sozinho ao fim de 1 ou 2 meses.</p>
        </div>

        <figure className="sm:col-span-7">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-none bg-[#F9FBFC]">
            {lifestyleImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lifestyleImage.src}
                srcSet={lifestyleImage.srcSet}
                sizes="(max-width: 640px) 100vw, 58vw"
                alt={name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : catalogImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={catalogImage}
                alt={name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : null}
          </div>
          {/* Linha de exemplo: modelo real, preço atual real e um preço alvo
              de exemplo (ver exampleTarget). */}
          <figcaption className={`grid grid-cols-2 border-x border-b sm:grid-cols-[1.4fr_1fr_1fr] ${LINE}`}>
            <div className={`col-span-2 border-b px-4 py-4 sm:col-span-1 sm:border-b-0 sm:border-r sm:px-6 sm:py-5 ${LINE}`}>
              <p className={LABEL}>Exemplo · {brand}</p>
              <p className="mt-1 text-[15px] font-medium leading-snug text-[#17232B]">{product.model_name}</p>
            </div>
            <div className={`border-r px-4 py-4 sm:px-6 sm:py-5 ${LINE}`}>
              <p className={LABEL}>Preço atual</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[#17232B]">{formatPrice(current)}</p>
            </div>
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <p className={LABEL}>Avisar abaixo de</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[#123F3A]">{formatPrice(target)}</p>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
