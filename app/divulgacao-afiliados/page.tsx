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
          O Parjusto é um site independente de comparação de preços de ténis.
          Para o manter gratuito, participamos nos programas de afiliados de
          algumas das lojas que comparamos.
        </p>
        <p>
          Alguns dos links &quot;Ver oferta&quot; são links de afiliado: se
          carregares num deles e fizeres uma compra, a loja pode pagar-nos uma
          pequena comissão. Tu pagas exatamente o mesmo preço: a comissão é
          paga pela loja, nunca por ti.
        </p>
        <p>
          Nesses casos, o link passa primeiro pela rede de afiliados da loja,
          que regista que a visita veio do Parjusto, e só depois te leva à
          página do produto na loja. Nas restantes lojas, o link aponta
          diretamente para a página do produto, sem qualquer identificador de
          afiliado.
        </p>
        <p>
          As comissões não mudam a forma como comparamos: as ofertas de cada
          ténis aparecem sempre ordenadas pelo preço, da mais barata para a mais
          cara, quer a loja nos pague comissão quer não. Os preços apresentados
          são os praticados pelas lojas, tal como os publicam nos seus sites.
        </p>
      </div>
    </main>
  )
}
