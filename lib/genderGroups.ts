// lib/genderGroups.ts

export type GenderGroupValue = 'homem' | 'mulher' | 'crianca'

// Regra de género: os grupos "Homem" e "Mulher" incluem também os produtos
// Unissexo; "Criança" fica sozinho. Fonte única desta regra — reutilizada
// no Header (links de navegação) e no filtro de género do catálogo, para
// nunca ficar duplicada/dessincronizada entre os dois sítios.
export const GENDER_GROUPS: Record<GenderGroupValue, string[]> = {
  homem: ['homem', 'unissexo'],
  mulher: ['mulher', 'unissexo'],
  crianca: ['crianca'],
}

export const GENDER_GROUP_VALUES = Object.keys(GENDER_GROUPS) as GenderGroupValue[]
