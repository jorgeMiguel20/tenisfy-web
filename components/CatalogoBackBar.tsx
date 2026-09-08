// components/CatalogoBackBar.tsx
import Link from 'next/link'

// So 'Página Inicial' (o 'Voltar' baseado no historico do browser foi
// removido a pedido do Jorge - no catalogo so faz sentido voltar ao inicio).
export default function CatalogoBackBar() {
  return (
    <div className="mb-6">
      <Link
        href="/"
        className="text-sm font-medium text-gray-500 hover:text-orange-600 transition-colors"
      >
        Pagina Inicial
      </Link>
    </div>
  )
}
