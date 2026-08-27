// components/CompararPreview.tsx
import Link from 'next/link'
import { formatPrice } from '@/lib/formatPrice'
import type { ProductWithPrice } from '@/lib/types'

// Mostra 2 produtos reais do catálogo (escolhidos em app/page.tsx) como
// prévia da funcionalidade de Comparar — nunca dados de exemplo inventados.
export default function CompararPreview({ products }: { products: ProductWithPrice[] }) {
  if (products.length < 2) return null
  const [a, b] = products

  return (
    <section className="grid sm:grid-cols-2 gap-8 sm:gap-12 items-center mb-12">
      <div>
        <span className="text-orange-600 text-xs font-bold uppercase tracking-wide">Comparar</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mt-2 mb-3">Vê os ténis lado a lado</h2>
        <p className="text-gray-500 mb-5 max-w-sm">
          Seleciona dois ténis e vê-os lado a lado, com preço e loja — sem abrir dez separadores.
        </p>
        <Link
          href="/comparar"
          className="inline-block bg-gray-900 text-white font-semibold text-sm rounded-full px-5 py-2.5 hover:bg-gray-800 transition-colors"
        >
          Ir para o Comparar
        </Link>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-lg p-6 sm:p-8 flex items-center justify-center gap-4 sm:gap-6">
        {[a, b].map((product, i) => (
          <div key={product.id} className="flex items-center gap-4 sm:gap-6">
            {i === 1 && <span className="text-xs font-semibold text-gray-400">vs</span>}
            <div className="flex flex-col items-center gap-2 w-24 sm:w-28">
              <div className="w-full aspect-square bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
                {product.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.model_name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <span className="text-xs font-semibold text-gray-900 text-center line-clamp-2">
                {product.model_name}
              </span>
              {product.lowest_price != null && (
                <span className="text-sm font-bold text-orange-600">{formatPrice(product.lowest_price)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
