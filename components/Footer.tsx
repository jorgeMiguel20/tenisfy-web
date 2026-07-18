// components/Footer.tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900">Tenisfy</p>
            <p className="text-sm text-gray-500 mt-1">
              Compara preços de ténis nas melhores lojas portuguesas
            </p>
          </div>

          <nav className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-gray-500">
            <Link href="/sobre" className="hover:text-gray-900 hover:underline">
              Sobre
            </Link>
            <Link href="/privacidade" className="hover:text-gray-900 hover:underline">
              Política de Privacidade
            </Link>
            <Link href="/termos" className="hover:text-gray-900 hover:underline">
              Termos de Utilização
            </Link>
            <Link href="/divulgacao-afiliados" className="hover:text-gray-900 hover:underline">
              Divulgação de Afiliados
            </Link>
          </nav>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Tenisfy. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}