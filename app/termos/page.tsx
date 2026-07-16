// app/termos/page.tsx
export const metadata = {
  title: 'Termos de Utilização | Tenisfy',
}

export default function TermosPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Termos de Utilização</h1>
      <p className="text-sm text-gray-400 mt-1">Última atualização: Julho 2026</p>

      <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-semibold text-gray-900 mb-2">1. Sobre o serviço</h2>
          <p>
            O Tenisfy é um serviço gratuito de comparação de preços. Apresentamos
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
            O Tenisfy não é responsável por transações, entregas, devoluções, ou
            disputas entre o utilizador e a loja parceira. Essas relações são
            exclusivamente entre o utilizador e a loja onde a compra é efetuada.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">4. Alterações</h2>
          <p>
            Estes termos podem ser atualizados periodicamente. O uso continuado
            do site após alterações implica a aceitação dos novos termos.
          </p>
        </section>
      </div>
    </main>
  )
}