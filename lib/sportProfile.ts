// lib/sportProfile.ts
//
// Ficha desportiva dos ténis de corrida, trail e ginásio: para que servem,
// em que piso, quanto amortecimento, que tipo de pisada, drop, peso e altura
// da sola. Fica guardada na coluna "sport_profile" (jsonb) da tabela
// products e só existe nos ténis de desporto - nos sneakers de rua fica
// vazia e a página não mostra nada.
//
// Regra: só dados oficiais da marca (página do produto ou ficha técnica),
// nunca notas inventadas. "source_url" guarda de onde vieram.
//
// Os ténis de trail ficam na categoria "trail" da tabela products (aparece
// como "Trail" no filtro do catálogo); os de estrada em "running".

export type SportUse = 'treino-diario' | 'ritmos-rapidos' | 'competicao' | 'trail' | 'ginasio' | 'caminhada'
export type SportSurface = 'estrada' | 'trilho' | 'misto' | 'interior'
export type SportCushioning = 'baixo' | 'medio' | 'alto'
export type SportPronation = 'neutra' | 'estabilidade'

export type SportProfile = {
  uses?: SportUse[]
  surfaces?: SportSurface[]
  cushioning?: SportCushioning
  pronation?: SportPronation
  drop_mm?: number
  weight_g?: number
  weight_note?: string // ex.: "tamanho 42 de homem"
  stack_mm?: number // altura da sola no calcanhar
  source_url?: string
  // Quando os dados vêm da ficha de uma loja (e não do site da marca), o
  // nome da loja - a página diz "Dados da <loja>" em vez de "Dados oficiais".
  source_name?: string
}

export const USE_LABELS: Record<SportUse, string> = {
  'treino-diario': 'Treino diário',
  'ritmos-rapidos': 'Ritmos rápidos',
  competicao: 'Competição',
  trail: 'Trail',
  ginasio: 'Ginásio',
  caminhada: 'Caminhada',
}

export const SURFACE_LABELS: Record<SportSurface, string> = {
  estrada: 'Estrada',
  trilho: 'Trilho',
  misto: 'Misto',
  interior: 'Interior',
}

export const CUSHIONING_LABELS: Record<SportCushioning, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
}

export const CUSHIONING_LEVEL: Record<SportCushioning, number> = {
  baixo: 1,
  medio: 2,
  alto: 3,
}

export const PRONATION_LABELS: Record<SportPronation, string> = {
  neutra: 'Neutra',
  estabilidade: 'Estabilidade',
}

// Lê a coluna sport_profile com cuidado: se vier vazia ou mal preenchida,
// devolve null e a página simplesmente não mostra a ficha.
export function readSportProfile(value: unknown): SportProfile | null {
  if (!value || typeof value !== 'object') return null
  const p = value as SportProfile
  const hasSomething =
    (p.uses?.length ?? 0) > 0 ||
    (p.surfaces?.length ?? 0) > 0 ||
    p.cushioning != null ||
    p.pronation != null ||
    p.drop_mm != null ||
    p.weight_g != null ||
    p.stack_mm != null
  return hasSomething ? p : null
}

export function joinLabels<T extends string>(values: T[] | undefined, labels: Record<T, string>): string | null {
  const list = (values ?? []).map((v) => labels[v]).filter(Boolean)
  return list.length > 0 ? list.join(' · ') : null
}
