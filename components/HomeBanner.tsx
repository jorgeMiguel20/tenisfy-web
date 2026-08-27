// components/HomeBanner.tsx

export default function HomeBanner() {
  return (
    <section className="relative overflow-hidden rounded-3xl mb-10 min-h-[280px] flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marketing/banner-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent"
      />

      <div className="relative px-6 py-10 sm:px-12 max-w-md">
        <span className="text-orange-400 text-xs font-bold uppercase tracking-wide">Todas as marcas</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-2 mb-3 leading-tight">
          Milhares de ténis.
          <br />
          Um só sítio.
        </h2>
        <p className="text-white/80 text-sm mb-5">
          Nike, Adidas, Asics e muitas outras marcas — verificamos os preços todos os dias para encontrares o teu par.
        </p>
        <a
          href="#catalogo"
          className="inline-block bg-white text-gray-900 font-semibold text-sm rounded-full px-5 py-2.5 hover:bg-gray-100 transition-colors"
        >
          Explorar catálogo
        </a>
      </div>
    </section>
  )
}
