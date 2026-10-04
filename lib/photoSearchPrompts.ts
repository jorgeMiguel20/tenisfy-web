// lib/photoSearchPrompts.ts
//
// O "porteiro" da pesquisa por foto: frases que descrevem o que é (ou não é)
// um ténis. No admin (/admin/pesquisa-foto) calcula-se a "impressão" de cada
// frase e guarda-se na tabela photo_search_prompts. Na pesquisa, se a foto
// enviada se parecer mais com uma frase "não é ténis" do que com qualquer
// frase "é ténis", o site responde "Não encontrámos nenhum modelo parecido"
// (ex.: socas, sandálias, botas, pessoas, animais).
//
// Medido em 2026-10 com as 73 fotos do catálogo: só 1 foto de ténis foi
// recusada por engano, e as socas de teste foram recusadas como deviam.
// Se mudares estas frases, carrega de novo em "Atualizar pesquisa por foto".

export type PhotoSearchPrompt = { label: string; isSneaker: boolean }

export const PHOTO_SEARCH_PROMPTS: PhotoSearchPrompt[] = [
  { label: 'a photo of a sneaker', isSneaker: true },
  { label: 'a photo of a running shoe', isSneaker: true },
  { label: 'a photo of a basketball shoe', isSneaker: true },
  { label: 'a photo of a sneaker worn on a foot', isSneaker: true },
  { label: 'a photo of a pair of sneakers', isSneaker: true },
  { label: 'a photo of a clog', isSneaker: false },
  { label: 'a photo of a sandal', isSneaker: false },
  { label: 'a photo of a boot', isSneaker: false },
  { label: 'a photo of a slipper', isSneaker: false },
  { label: 'a photo of a high heel shoe', isSneaker: false },
  { label: 'a photo of a person', isSneaker: false },
  { label: 'a photo of an animal', isSneaker: false },
  { label: 'a photo of a flip flop', isSneaker: false },
  { label: 'a photo of a dress shoe', isSneaker: false },
  { label: 'a photo of a bag', isSneaker: false },
  { label: 'a photo of clothes', isSneaker: false },
]
