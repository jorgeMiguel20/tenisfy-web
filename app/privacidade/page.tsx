// app/privacidade/page.tsx
export const metadata = {
  title: 'Política de Privacidade | Parjusto',
  description: 'Como o Parjusto trata os teus dados: conta opcional, alertas de preço, favoritos e cookies.',
  alternates: { canonical: '/privacidade' },
}

const linkClass =
  'font-medium text-[#123F3A] underline decoration-[#123F3A]/30 underline-offset-4 hover:decoration-[#123F3A]'

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
          <p className="mt-3">
            O Parjusto é o responsável pelo tratamento dos dados descritos nesta
            política. Para qualquer questão sobre eles, escreve-nos para{' '}
            <a href="mailto:geral@parjusto.pt" className={linkClass}>
              geral@parjusto.pt
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">2. Dados que recolhemos e porquê</h2>
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
            (como a data de criação da conta e do último acesso). Tratamos estes
            dados porque pediste a conta, para te prestarmos esse serviço.
          </p>
          <p className="mt-3">
            <span className="font-medium text-gray-900">Alertas de preço.</span>{' '}
            Se ativares um alerta de preço, guardamos o teu email, o produto, o
            valor que escolheste e o prazo do alerta, e usamos o email
            exclusivamente para te avisar quando o preço descer. Sem conta, pedimos
            primeiro que confirmes o alerta através de um email. Tratamos estes
            dados porque pediste o alerta, e só para esse fim.
          </p>
          <p className="mt-3">
            <span className="font-medium text-gray-900">Estatísticas de visitas.</span>{' '}
            Usamos o Vercel Analytics para perceber, de forma agregada e anónima,
            quantas pessoas visitam o site. Esta ferramenta não usa cookies nem
            identifica visitantes individualmente.
          </p>
          <p className="mt-3">
            <span className="font-medium text-gray-900">Segurança do site.</span>{' '}
            Para impedir abusos (por exemplo, pedidos em excesso para encher a
            caixa de email de alguém), limitamos o número de pedidos por pessoa.
            Para isso, guardamos temporariamente uma impressão digital cifrada do
            teu endereço IP e, nos pedidos de alerta, do email indicado, a partir
            da qual não é possível recuperar o IP nem o email. Estes registos são
            apagados automaticamente ao fim de cerca de 24 horas. Tratamos estes dados
            por interesse legítimo na segurança do site.
          </p>
          <p className="mt-3">
            Nunca partilhamos o teu email com terceiros para fins comerciais nem o
            usamos para qualquer outro tipo de comunicação.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">3. Durante quanto tempo guardamos os dados</h2>
          <p>
            Os alertas de preço são apagados automaticamente quando termina o prazo
            que escolheste (1 ou 2 meses), incluindo os que nunca chegaste a
            confirmar. Os dados da conta (email, favoritos e alertas) ficam
            guardados até apagares a conta em &ldquo;A minha conta&rdquo;; nessa
            altura, tudo é apagado. Sem conta, os favoritos só existem no teu
            dispositivo e podes apagá-los limpando os dados do site no browser.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">4. Serviços que usamos</h2>
          <p>
            Para o site funcionar, recorremos a estes fornecedores, que tratam os
            dados só por nossa conta e segundo as nossas instruções: Supabase (base
            de dados e contas), Resend (envio dos emails de entrada e de alertas de
            preço) e Vercel (alojamento do site e estatísticas anónimas de visitas).
          </p>
          <p className="mt-3">
            Alguns destes fornecedores têm sede ou operam fora da União Europeia,
            por exemplo nos Estados Unidos. Quando isso acontece, os dados só são
            transferidos com as garantias previstas na lei, como as cláusulas
            contratuais-tipo aprovadas pela Comissão Europeia.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">5. Cookies e armazenamento no dispositivo</h2>
          <p>
            Usamos apenas cookies e armazenamento técnicos, essenciais ao
            funcionamento do site: para guardar os teus favoritos no dispositivo,
            para lembrar que já viste o aviso de cookies e, se entrares na tua
            conta, para manter a sessão iniciada. Não usamos cookies de publicidade
            nem de rastreamento.
          </p>
          <p className="mt-3">
            Os links &ldquo;Ver oferta&rdquo; levam diretamente à página da loja,
            sem qualquer identificador de afiliado (ver Divulgação de Afiliados).
            Depois de saíres do Parjusto, a loja pode usar os seus próprios cookies,
            segundo a política dela.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">6. Links para lojas</h2>
          <p>
            Ao clicar num link &ldquo;Ver oferta&rdquo;, és redirecionado para o site da loja,
            que tem a sua própria política de privacidade e termos, independentes
            dos do Parjusto.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">7. Os teus direitos</h2>
          <p>
            Podes pedir a qualquer momento o acesso aos teus dados, a sua correção
            ou o seu apagamento, a limitação ou a oposição ao tratamento, e uma
            cópia dos dados num formato de uso comum (portabilidade). Podes também
            retirar a qualquer momento a autorização que deste, o que não afeta o
            que já foi feito até então.
          </p>
          <p className="mt-3">
            Se tiveres conta, podes ver os teus favoritos e alertas e apagar a
            conta (com tudo o que está guardado nela) diretamente em
            &ldquo;A minha conta&rdquo;, sem precisares de nos contactar. Sem conta,
            podes cancelar um alerta através do link incluído em cada email que
            enviamos. Para qualquer outro pedido, escreve para{' '}
            <a href="mailto:geral@parjusto.pt" className={linkClass}>
              geral@parjusto.pt
            </a>{' '}
            e respondemos no prazo máximo de um mês.
          </p>
          <p className="mt-3">
            Se achares que os teus dados não estão a ser bem tratados, tens o
            direito de apresentar queixa à autoridade de controlo em Portugal, a
            Comissão Nacional de Proteção de Dados (CNPD), em{' '}
            <a
              href="https://www.cnpd.pt"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              cnpd.pt
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">8. Contacto</h2>
          <p>
            Para questões sobre esta política, contacta-nos através de{' '}
            <a href="mailto:geral@parjusto.pt" className={linkClass}>
              geral@parjusto.pt
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
