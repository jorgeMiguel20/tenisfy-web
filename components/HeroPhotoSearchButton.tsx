'use client'

type Props = {
  onClick: () => void
  loading?: boolean
}

// Ícone de câmara da barra de pesquisa do Hero. Ao contrário da versão
// anterior (que só acionava o estado partilhado do cabeçalho - ver
// lib/searchModal.ts - obrigando a um segundo toque no ícone de câmara do
// HeaderSearchBar para o seletor nativo abrir de facto), este botão só
// aciona o file input que o próprio HeroSearchBar.tsx já lhe passa,
// abrindo a câmara/galeria logo ao primeiro toque.
export default function HeroPhotoSearchButton({ onClick, loading = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Pesquisar por foto"
      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-700 shrink-0 disabled:opacity-60"
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      )}
    </button>
  )
}
