// app/divulgacao-afiliados/page.tsx
export const metadata = {
  title: 'Divulgação de Afiliados | Parjusto',
  description: 'Como o Parjusto se financia: podemos receber uma comissão das lojas, sem qualquer custo extra para ti.',
  alternates: { canonical: '/divulgacao-afiliados' },
}

export default function DivulgacaoAfiliadosPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Divulgação de Afiliados</h1>
      <p className="text-sm text-gray-400 mt-1">Última atualização: Outubro 2026</p>

      <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
        <p>
          O Parjusto é um site independente de comparação de preços. Atualmente
          não participamos em nenhum programa de marketing de afiliados: os
          links "Ver oferta" apontam diretamente para a página do produto na
          loja, sem qualquer identificador de afiliado ou rastreio
          associado, e não recebemos qualquer comissão pelas tuas compras.
        </p>
        <p>
          Os preços apresentados são os praticados pelas lojas, tal como os
          publicam nos seus sites.
        </p>
        <p>
          Se isso vier a mudar no futuro — por exemplo, ao aderirmos a um
          programa de afiliados — atualizaremos esta página antes disso
          acontecer, para que saibas sempre exatamente como o Parjusto se
          sustenta.
        </p>
      </div>
    </main>
  )
}