// app/termos/page.tsx
import Link from 'next/link'

export const metadata = {
  title: 'Termos de Utilização | Parjusto',
  description: 'Termos de utilização do Parjusto, o comparador de preços de ténis em Portugal.',
  alternates: { canonical: '/termos' },
}

export default function TermosPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Termos de Utilização</h1>
      <p className="text-sm text-gray-400 mt-1">Última atualização: Setembro 2026</p>

      <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-semibold text-gray-900 mb-2">1. Sobre o serviço</h2>
          <p>
            O Parjusto é um serviço gratuito de comparação de preços. Apresentamos
            informação recolhida de lojas parceiras a título informativo. Não
            vendemos produtos nem processamos pagamentos diretamente.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">2. Precisão da informação</h2>
          <p>
            Fazemos um esforço razoável para manter preços e disponibilidade
            atualizados, mas não garantimos que a informação apresentada
            corresponda sempre ao preço final na loja parceira. Confirma sempre
            o preço e condições no site da loja antes de finalizar a compra.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">3. Responsabilidade</h2>
          <p>
            O Parjusto não é responsável por transações, entregas, devoluções, ou
            disputas entre o utilizador e a loja parceira. Essas relações são
            exclusivamente entre o utilizador e a loja onde a compra é efetuada.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">4. Conta e alertas de preço</h2>
          <p>
            Podes usar o Parjusto sem conta. Se criares uma conta ou ativares um
            alerta de preço, deves usar um email teu. Os alertas são meramente
            informativos: avisamos-te quando o preço descer, mas não garantimos que
            o aviso chegue a tempo nem que o preço se mantenha até comprares.
            Podes apagar a conta a qualquer momento em &ldquo;A minha conta&rdquo;.
            O tratamento dos teus dados está descrito na nossa{' '}
            <Link
              href="/privacidade"
              className="font-medium text-[#123F3A] underline decoration-[#123F3A]/30 underline-offset-4 hover:decoration-[#123F3A]"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">5. Alterações</h2>
          <p>
            Estes termos podem ser atualizados periodicamente. O uso continuado
            do site após alterações implica a aceitação dos novos termos.
          </p>
        </section>
      </div>
    </main>
  )
}