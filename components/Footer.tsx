// components/Footer.tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">
          <div>
            <p className="font-display text-xl font-bold tracking-tight text-white">Parjusto</p>
            <p className="text-sm text-gray-400 mt-2 max-w-xs">
              Compara preços, stock e tamanhos nas melhores lojas.
            </p>
          </div>

          <nav className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Catálogo</p>
            <Link href="/catalogo?genero=homem" className="text-sm text-gray-300 hover:text-white transition-colors">
              Homem
            </Link>
            <Link href="/catalogo?genero=mulher" className="text-sm text-gray-300 hover:text-white transition-colors">
              Mulher
            </Link>
            <Link href="/catalogo?genero=crianca" className="text-sm text-gray-300 hover:text-white transition-colors">
              Crianças
            </Link>
          </nav>

          <nav className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Ferramentas</p>
            <Link href="/comparar" className="text-sm text-gray-300 hover:text-white transition-colors">
              Comparar
            </Link>
            <Link href="/favoritos" className="text-sm text-gray-300 hover:text-white transition-colors">
              Favoritos
            </Link>
          </nav>

          <nav className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Legal</p>
            <Link href="/sobre" className="text-sm text-gray-300 hover:text-white transition-colors">
              Sobre
            </Link>
            <Link href="/privacidade" className="text-sm text-gray-300 hover:text-white transition-colors">
              Política de Privacidade
            </Link>
            <Link href="/termos" className="text-sm text-gray-300 hover:text-white transition-colors">
              Termos de Utilização
            </Link>
            <Link href="/divulgacao-afiliados" className="text-sm text-gray-300 hover:text-white transition-colors">
              Divulgação de Afiliados
            </Link>
          </nav>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Parjusto. Todos os direitos reservados.
          </p>
          <p className="text-sm text-gray-500">Feito em Portugal</p>
        </div>
      </div>
    </footer>
  )
}
