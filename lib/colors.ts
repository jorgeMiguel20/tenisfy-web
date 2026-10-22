// lib/colors.ts
//
// Cor principal de cada ténis, para o filtro "Cor" do catálogo e da página
// Promoções.
//
// As lojas escrevem a cor como "Preto / branco" ou "Castanho / preto / branco":
// a primeira é a cor dominante e as seguintes são detalhes. O filtro conta
// cada ténis só pela PRIMEIRA cor que se reconhece, por isso quem escolhe
// "Preto" vê ténis pretos, e um "Castanho / preto" aparece em "Castanho".
//
// (Não usa a coluna base_colors da base de dados, que guarda até 2 cores e
// por isso metia nos "Preto" ténis que só têm preto como detalhe.)

export const COLOR_ORDER = [
  'Preto',
  'Branco',
  'Cinzento',
  'Azul',
  'Vermelho',
  'Verde',
  'Amarelo',
  'Laranja',
  'Rosa',
  'Roxo',
  'Castanho',
  'Bege',
  'Multicolor',
] as const

// Palavras que identificam cada cor (já sem hífenes e em minúsculas; o texto
// da loja também é limpo da mesma maneira antes de comparar). Português
// primeiro, inglês só para os poucos ténis cuja cor veio na língua original.
const COLOR_WORDS: Record<(typeof COLOR_ORDER)[number], string[]> = {
  Preto: ['preto', 'negro', 'antracite', 'carvão', 'carvao', 'ébano', 'ebano', 'black'],
  Branco: ['branco', 'off white', 'offwhite', 'marfim', 'ecru', 'écru', 'neve', 'white'],
  Cinzento: ['cinzento', 'cinza', 'prata', 'prateado', 'platina', 'grafite', 'chumbo', 'grey', 'gray', 'silver'],
  Azul: ['azul', 'marinho', 'navy', 'ganga', 'turquesa', 'petróleo', 'petroleo', 'celeste', 'aqua', 'índigo', 'indigo', 'cobalto', 'safira', 'blue'],
  Vermelho: ['vermelho', 'bordeaux', 'bordô', 'bordo', 'borgonha', 'vinho', 'cereja', 'coral', 'carmim', 'grená', 'grena', 'lagosta', 'framboesa', 'red'],
  Verde: ['verde', 'oliva', 'oliveira', 'menta', 'caqui', 'cáqui', 'khaki', 'lima', 'lime', 'esmeralda', 'jade', 'sálvia', 'salvia', 'kiwi', 'green'],
  Amarelo: ['amarelo', 'mostarda', 'dourado', 'ouro', 'limão', 'limao', 'yellow', 'gold'],
  Laranja: ['laranja', 'alperce', 'pêssego', 'pessego', 'ferrugem', 'abóbora', 'abobora', 'tangerina', 'orange'],
  Rosa: ['rosa', 'rosé', 'rose', 'fúcsia', 'fucsia', 'magenta', 'salmão', 'salmao', 'blush', 'pitaya', 'pink'],
  Roxo: ['roxo', 'violeta', 'violet', 'lilás', 'lilas', 'lavanda', 'malva', 'púrpura', 'purpura', 'amora', 'uva', 'plum', 'purple'],
  Castanho: ['castanho', 'marrom', 'camel', 'camelo', 'chocolate', 'conhaque', 'cognac', 'caramelo', 'mocha', 'café', 'cappuccino', 'tabaco', 'sépia', 'sepia', 'bronze', 'umbra', 'camurça', 'camurca', 'brown'],
  Bege: ['bege', 'creme', 'areia', 'nude', 'taupe', 'cor de pele', 'estuque', 'greige', 'champanhe', 'pedra', 'aveia', 'beige'],
  Multicolor: ['multicolor', 'multicolour', 'multicor', 'cores mistas', 'mistura'],
}

// Só letras e espaços, com espaço a cada lado: assim "cor de rosa" e
// "cor-de-rosa" ficam iguais e uma palavra só casa inteira ("lima" não casa
// em "climatizado"). Sem lookbehind, que alguns iPhones mais antigos não
// aceitam.
function clean(text: string) {
  return ` ${text.toLowerCase().replace(/[^\p{L}]+/gu, ' ').trim()} `
}

const PATTERNS: [string, string[]][] = COLOR_ORDER.map((name) => [
  name,
  COLOR_WORDS[name].map((w) => ` ${clean(w).trim()} `),
])

const cache = new Map<string, string | null>()

// Devolve a cor principal ("Preto", "Rosa"...) ou null se não se reconhecer
// nenhuma. Em "Verde néon / verde claro / preto" devolve "Verde".
export function mainColor(colorText: string | null | undefined): string | null {
  if (!colorText) return null
  const hit = cache.get(colorText)
  if (hit !== undefined) return hit

  let result: string | null = null
  for (const part of colorText.split('/')) {
    const text = clean(part)
    let best: string | null = null
    let bestIndex = Infinity
    for (const [name, words] of PATTERNS) {
      for (const w of words) {
        const index = text.indexOf(w)
        if (index !== -1 && index < bestIndex) {
          bestIndex = index
          best = name
        }
      }
    }
    if (best) {
      result = best
      break
    }
  }
  cache.set(colorText, result)
  return result
}

// Amostra de cor ao lado do nome, no filtro "Cor".
export const COLOR_SWATCHES: Record<string, string> = {
  Preto: '#17232B',
  Branco: '#FFFFFF',
  Cinzento: '#9AA3AB',
  Azul: '#2F5DA8',
  Vermelho: '#C8322F',
  Verde: '#2F7A55',
  Amarelo: '#E8C547',
  Laranja: '#E8833A',
  Rosa: '#E79AB5',
  Roxo: '#7A4FA0',
  Castanho: '#7B5230',
  Bege: '#D9C7A7',
  Multicolor: 'conic-gradient(#C8322F, #E0A33A, #2F7A55, #2F5DA8, #7A4FA0, #C8322F)',
}
