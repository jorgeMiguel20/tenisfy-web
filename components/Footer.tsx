// components/Footer.tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0e0e0d] mt-16">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">
          <div>
            <p className="font-display text-xl font-bold tracking-tight text-white">Parjusto</p>
            <p className="text-sm text-gray-400 mt-2 max-w-xs">
              Compara preços, stock e tamanhos nas melhores lojas.
            </p>
            {/* Perfis oficiais nas redes sociais (os mesmos indicados ao Google
                em app/page.tsx, "sameAs"). rel="me": diz que são do Parjusto. */}
            <div className="mt-5 flex items-center gap-4">
              <a
                href="https://www.instagram.com/parjusto.oficial/"
                target="_blank"
                rel="me noopener"
                aria-label="Parjusto no Instagram"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@parjusto.oficial"
                target="_blank"
                rel="me noopener"
                aria-label="Parjusto no TikTok"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>
            </div>
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
            <Link href="/marcas" className="text-sm text-gray-300 hover:text-white transition-colors">
              Marcas
            </Link>
            <Link href="/promocoes" className="text-sm text-gray-300 hover:text-white transition-colors">
              Promoções
            </Link>
            <Link href="/guias" className="text-sm text-gray-300 hover:text-white transition-colors">
              Guias
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
