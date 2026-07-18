// app/sobre/page.tsx
export const metadata = {
  title: 'Sobre o Tenisfy',
}

export default function SobrePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Sobre o Tenisfy</h1>

      <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
        <p>
          O Tenisfy nasceu de uma ideia simples: comprar ténis em Portugal
          significa saltar de site em site à procura do melhor preço, sem
          nunca ter a certeza se encontraste mesmo a oferta mais vantajosa.
          Criámos o Tenisfy para resolver exatamente isso — comparar preços
          de ténis das principais lojas portuguesas, num só sítio.
        </p>

        <p>
          Somos um projeto independente, construído em Portugal, focado em
          transparência: mostramos o preço real de cada loja parceira, e a
          escolha final é sempre tua. Não vendemos produtos diretamente —
          apenas ajudamos-te a encontrar a melhor oferta antes de comprares.
        </p>

        <p>
          O Tenisfy está em desenvolvimento contínuo. Estamos a adicionar
          novos modelos e lojas regularmente, com o objetivo de nos tornarmos
          a referência para quem procura o melhor preço em ténis de marca em
          Portugal.
        </p>

        <p>
          Tens alguma sugestão, encontraste um erro, ou queres propor uma
          parceria? Contacta-nos através de{' '}
          <a href="mailto:jorgesantos_09@hotmail.com" className="text-orange-600 hover:underline">
            jorgesantos_09@hotmail.com
          </a>
          .
        </p>
      </div>
    </main>
  )
}