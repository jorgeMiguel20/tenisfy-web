// components/CatalogoBackBar.tsx
import Link from 'next/link'

// So 'Página Inicial' (o 'Voltar' baseado no historico do browser foi
// removido a pedido do Jorge - no catalogo so faz sentido voltar ao inicio).
export default function CatalogoBackBar() {
  return (
    <div className="mb-6">
      <Link
        href="/"
        className="text-[13px] text-[#5C6770] transition-colors hover:text-[#17232B]"
      >
        Página Inicial
      </Link>
    </div>
  )
}
