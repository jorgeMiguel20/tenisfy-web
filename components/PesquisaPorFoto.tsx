// components/PesquisaPorFoto.tsx
import PesquisaPorFotoButton from './PesquisaPorFotoButton'

// Secção só ilustrativa/explicativa — a funcionalidade real de pesquisa por
// foto já existe (app/api/search-by-image/route.ts, usada pelo modal
// unificado de pesquisa - ver components/SearchModal.tsx). Por isso o
// rótulo abaixo não inventa uma percentagem de semelhança falsa: diz
// claramente "exemplo".
export default function PesquisaPorFoto() {
  return (
    <section className="grid sm:grid-cols-2 gap-8 sm:gap-12 items-center mb-12 mt-4">
      <div>
        {/* orange-700 (não orange-600) por contraste - ver nota abaixo */}
        <span className="text-orange-700 text-xs font-bold uppercase tracking-wide">Pesquisa por foto</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mt-2 mb-3">
          Viste uns ténis na rua? Tira uma foto.
        </h2>
        <p className="text-gray-500 mb-5 max-w-sm">
          Procuramos no nosso catálogo os ténis mais parecidos com a tua foto, com preço incluído — funciona com
          fotos da câmara ou imagens guardadas no telemóvel, incluindo screenshots.
        </p>
        <PesquisaPorFotoButton />
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

        {/* Barra de scanner animada - ilustra visualmente a pesquisa por
            foto a "ler" a imagem, tal como no mockup v2 do Jorge (foto 7 do
            feedback). Puramente decorativa (aria-hidden), CSS puro via
            <style> aqui dentro para nao depender de nenhuma configuracao
            extra do Tailwind. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 bottom-0 overflow-hidden">
          <div className="pjt-scan-line absolute inset-x-0 h-12 -top-12" />
        </div>
        <style>{`
          @keyframes pjt-scan {
            0% { top: -3rem; }
            50% { top: 100%; }
            100% { top: -3rem; }
          }
          .pjt-scan-line {
            background: linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0.85) 50%,
              rgba(255, 255, 255, 0) 100%
            );
            box-shadow: 0 0 16px 2px rgba(255, 255, 255, 0.55);
            animation: pjt-scan 2.6s ease-in-out infinite;
          }
        `}</style>
      </div>
    </section>
  )
}
