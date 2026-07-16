// app/divulgacao-afiliados/page.tsx
export const metadata = {
  title: 'Divulgação de Afiliados | Tenisfy',
}

export default function DivulgacaoAfiliadosPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Divulgação de Afiliados</h1>
      <p className="text-sm text-gray-400 mt-1">Última atualização: Julho 2026</p>

      <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
        <p>
          O Tenisfy participa em programas de marketing de afiliados. Isto
          significa que, quando clicas num link "Ver oferta" e realizas uma
          compra na loja parceira, o Tenisfy pode receber uma comissão — sem
          qualquer custo adicional para ti.
        </p>
        <p>
          Esta comissão não influencia os preços apresentados: mostramos o
          preço real praticado pela loja parceira, e a nossa comissão é paga
          separadamente pela loja, não pelo consumidor.
        </p>
        <p>
          O uso de links de afiliados ajuda a manter o Tenisfy gratuito e a
          continuar a comparar preços de forma independente.
        </p>
      </div>
    </main>
  )
}