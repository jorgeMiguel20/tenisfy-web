// app/privacidade/page.tsx
export const metadata = {
  title: 'Política de Privacidade | Parjusto',
  description: 'Como o Parjusto trata os teus dados: conta opcional, alertas de preço, favoritos e cookies.',
  alternates: { canonical: '/privacidade' },
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
            produtos diretamente — redirecionamos para as lojas onde a compra é
            efetivamente realizada.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">2. Dados que recolhemos</h2>
          <p>
            Não precisas de conta para navegares, comparares preços ou guardares
            favoritos. Sem conta, os teus favoritos ficam guardados só no teu
            dispositivo (no browser) e nunca chegam até nós.
          </p>
          <p className="mt-3">
            <span className="font-medium text-gray-900">Conta (opcional).</span>{' '}
            Se decidires entrar com o teu email, guardamos o teu email, a lista de
            produtos que marcaste como favoritos e os teus alertas de preço, para
            os teres em todos os dispositivos onde entrares. Não pedimos
            palavra-passe nem mais nenhum dado. Para manter a sessão iniciada,
            o nosso fornecedor de contas regista também dados técnicos da sessão
            (como a data de criação da conta e do último acesso).
          </p>
          <p className="mt-3">
            <span className="font-medium text-gray-900">Alertas de preço.</span>{' '}
            Se ativares um alerta de preço, guardamos o teu email, o produto, o
            valor que escolheste e o prazo do alerta, e usamos o email
            exclusivamente para te avisar quando o preço descer. Sem conta, pedimos
            primeiro que confirmes o alerta através de um email. Os alertas são
            apagados automaticamente quando termina o prazo que escolheste (1 ou 2
            meses).
          </p>
          <p className="mt-3">
            Nunca partilhamos o teu email com terceiros para fins comerciais nem o
            usamos para qualquer outro tipo de comunicação.
          </p>
          <p className="mt-3">
            Usamos também o Vercel Analytics para perceber, de forma agregada e
            anónima, quantas pessoas visitam o site — esta ferramenta não usa
            cookies nem identifica visitantes individualmente.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">3. Serviços que usamos</h2>
          <p>
            Para o site funcionar, recorremos a estes fornecedores, que tratam os
            dados só por nossa conta: Supabase (base de dados e contas), Resend
            (envio dos emails de entrada e de alertas de preço) e Vercel
            (alojamento do site e estatísticas anónimas de visitas).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">4. Cookies</h2>
          <p>
            Usamos apenas cookies e armazenamento técnicos, essenciais ao
            funcionamento do site: para guardar os teus favoritos no dispositivo e,
            se entrares na tua conta, para manter a sessão iniciada. Não utilizamos
            atualmente cookies de publicidade ou rastreamento de terceiros para além
            dos necessários ao funcionamento dos links de afiliados (ver Divulgação
            de Afiliados).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">5. Links para lojas</h2>
          <p>
            Ao clicar num link &ldquo;Ver oferta&rdquo;, és redirecionado para o site da loja,
            que tem a sua própria política de privacidade e termos, independentes
            dos do Parjusto.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">6. Os teus direitos</h2>
          <p>
            Podes pedir a qualquer momento para consultarmos, corrigirmos ou
            apagarmos os dados que temos sobre ti. Se tiveres conta, podes ver os
            teus favoritos e alertas e apagar a conta (com tudo o que está guardado
            nela) diretamente em &ldquo;A minha conta&rdquo;, sem precisares de nos contactar.
            Sem conta, podes cancelar um alerta através do link incluído em cada
            email que enviamos.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">7. Contacto</h2>
          <p>
            Para questões sobre esta política, contacta-nos através de{' '}
            <a href="mailto:geral@parjusto.pt" className="font-medium text-[#123F3A] underline decoration-[#123F3A]/30 underline-offset-4 hover:decoration-[#123F3A]">
              geral@parjusto.pt
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
