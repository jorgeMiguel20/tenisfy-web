// app/privacidade/page.tsx
export const metadata = {
  title: 'Política de Privacidade | Parjusto',
}

export default function PrivacidadePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
      <p className="text-sm text-gray-400 mt-1">Última atualização: Setembro 2026</p>

      <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-semibold text-gray-900 mb-2">1. Quem somos</h2>
          <p>
            O Parjusto é uma plataforma de comparação de preços de ténis e calçado
            desportivo, operada de forma independente em Portugal. Não vendemos
            produtos diretamente — redirecionamos para lojas parceiras onde a
            compra é efetivamente realizada.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">2. Dados que recolhemos</h2>
          <p>
            O Parjusto não requer registo nem conta de utilizador para navegares
            ou comparares preços. A única informação pessoal que pedimos é o teu
            email, e só se decidires ativar um alerta de preço para um produto —
            nesse caso usamos o email exclusivamente para te avisar quando o
            preço descer ou o tamanho voltar a ficar disponível. Nunca partilhamos
            esse email com terceiros nem o usamos para qualquer outro tipo de
            comunicação.
          </p>
          <p className="mt-3">
            Usamos também o Vercel Analytics para perceber, de forma agregada e
            anónima, quantas pessoas visitam o site — esta ferramenta não usa
            cookies nem identifica visitantes individualmente.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">3. Cookies</h2>
          <p>
            Este site pode utilizar cookies técnicos essenciais ao funcionamento
            da página. Não utilizamos atualmente cookies de publicidade ou
            rastreamento de terceiros para além dos necessários ao funcionamento
            dos links de afiliados (ver Divulgação de Afiliados).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">4. Links para lojas parceiras</h2>
          <p>
            Ao clicar num link "Ver oferta", és redirecionado para o site da loja
            parceira, que tem a sua própria política de privacidade e termos,
            independentes dos do Parjusto.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">5. Os teus direitos</h2>
          <p>
            Podes pedir a qualquer momento para consultarmos, corrigirmos ou
            apagarmos os dados que temos sobre ti — no caso do Parjusto, isto
            resume-se ao email associado a um alerta de preço. Podes também
            cancelar um alerta diretamente através do link incluído em cada
            email que enviamos, sem precisares de nos contactar.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">6. Contacto</h2>
          <p>
            Para questões sobre esta política, contacta-nos através de{' '}
            <a href="mailto:geral@parjusto.pt" className="text-orange-600 hover:underline">
              geral@parjusto.pt
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
