// components/PesquisaPorFoto.tsx

// Secção só ilustrativa/explicativa — a funcionalidade real de pesquisa por
// foto já existe (app/api/search-by-image/route.ts, usada pelo botão de
// câmara na barra de pesquisa em #catalogo). Por isso o rótulo abaixo não
// inventa uma percentagem de semelhança falsa: diz claramente "exemplo".
export default function PesquisaPorFoto() {
  return (
    <section className="grid sm:grid-cols-2 gap-8 sm:gap-12 items-center mb-12 mt-4">
      <div>
        <span className="text-orange-600 text-xs font-bold uppercase tracking-wide">Pesquisa por foto</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mt-2 mb-3">
          Viste uns ténis na rua? Tira uma foto.
        </h2>
        <p className="text-gray-500 mb-5 max-w-sm">
          Procuramos no nosso catálogo os ténis mais parecidos com a tua foto, com preço incluído — funciona com
          fotos da câmara ou imagens guardadas no telemóvel, incluindo screenshots.
        </p>
        <a
          href="#catalogo"
          className="inline-block bg-gray-900 text-white font-semibold text-sm rounded-full px-5 py-2.5 hover:bg-gray-800 transition-colors"
        >
          Experimenta a Pesquisa por Foto
        </a>
      </div>

      <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marketing/photo-search-bg.jpg"
          alt="Telemóvel a fotografar um par de ténis"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent"
        />
        <span className="absolute bottom-4 left-4 right-4 bg-white/95 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-900">
          Exemplo — a funcionalidade já está disponível na pesquisa acima
        </span>
      </div>
    </section>
  )
}
