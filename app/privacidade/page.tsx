// app/privacidade/page.tsx
export const metadata = {
  title: 'Política de Privacidade | Tenisfy',
}

export default function PrivacidadePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
      <p className="text-sm text-gray-400 mt-1">Última atualização: Julho 2026</p>

      <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-semibold text-gray-900 mb-2">1. Quem somos</h2>
          <p>
            O Tenisfy é uma plataforma de comparação de preços de ténis e calçado
            desportivo, operada de forma independente em Portugal. Não vendemos
            produtos diretamente — redirecionamos para lojas parceiras onde a
            compra é efetivamente realizada.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">2. Dados que recolhemos</h2>
          <p>
            Atualmente, o Tenisfy não requer registo nem conta de utilizador. Não
            recolhemos dados pessoais diretamente através do site. Podemos, no
            futuro, utilizar ferramentas de análise de tráfego anónimo (ex: número
            de visitas) para melhorar o serviço.
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
            independentes dos do Tenisfy.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">5. Contacto</h2>
          <p>
            Para questões sobre esta política, contacta-nos através de{' '}
            <a href="mailto:jorgesantos_09@hotmail.com" className="text-orange-600 hover:underline">
              jorgesantos_09@hotmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}