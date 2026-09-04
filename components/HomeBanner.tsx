// components/HomeBanner.tsx
import Link from 'next/link'

export default function HomeBanner() {
  return (
    <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden mb-10 min-h-[240px] max-h-[280px] sm:aspect-[21/9] sm:min-h-[220px] sm:max-h-none flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/banner-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center sm:object-[65%_45%]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent"
      />

      {/* Mesma logica de "imagem edge-to-edge, texto alinhado com a pagina"
          do HomeHero.tsx - ver comentario la. */}
      <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-12">
        <div className="max-w-md">
          <span className="text-orange-400 text-xs font-bold uppercase tracking-wide">Todas as marcas</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-2 mb-2 sm:mb-3 leading-tight">
            Milhares de ténis.
            <br />
            Um só sítio.
          </h2>
          <p className="text-white/80 text-sm mb-4 sm:mb-5 line-clamp-2 sm:line-clamp-none">
            Nike, Adidas, Asics e muitas outras marcas — verificamos os preços todos os dias para encontrares o teu par.
          </p>
          <Link
            href="/catalogo"
            className="inline-block bg-white text-gray-900 font-semibold text-sm rounded-full px-5 py-2.5 hover:bg-gray-100 transition-colors"
          >
            Explorar catálogo
          </Link>
        </div>
      </div>
    </section>
  )
}
