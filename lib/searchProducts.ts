// lib/searchProducts.ts
import Fuse from 'fuse.js'
import type { ProductWithPrice } from './types'

// Pesquisa por palavras, usada na grelha do catálogo e no seletor do
// /comparar (e no futuro em qualquer outra caixa de pesquisa de ténis).
//
// Como funciona: o texto escrito é dividido em palavras e CADA palavra tem de
// aparecer na marca ou no nome do ténis, por qualquer ordem. Assim
// "adidas samba" encontra todos os Samba da adidas, e "adidas climacool"
// encontra os Climacool da adidas. Antes, o texto todo era comparado de uma
// vez com o nome (só) e com a marca (só), e por isso "adidas samba" só
// encontrava 4 dos 103 Samba e "adidas climacool" não encontrava nenhum.
//
// Sem acentos nem maiúsculas ("ténis" = "tenis"). Palavras ainda por acabar
// também servem ("nik" encontra Nike). Se nada for encontrado, tenta de novo
// aceitando pequenos erros de escrita nas palavras com 4 ou mais letras
// ("nikke" encontra Nike).

type Searchable = Pick<ProductWithPrice, 'model_name'> & { brands?: { name: string } | null }

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Texto de cada ténis (marca + nome, já normalizado), guardado por ténis para
// não ser refeito a cada letra escrita.
const textCache = new WeakMap<object, string>()

function textOf(product: Searchable): string {
  let text = textCache.get(product)
  if (text === undefined) {
    text = normalizeSearchText(`${product.brands?.name ?? ''} ${product.model_name}`)
    textCache.set(product, text)
  }
  return text
}

// 0 = a palavra começa uma palavra do texto; 0,1 = aparece a meio de uma
// palavra; null = não aparece.
function exactScore(text: string, token: string): number | null {
  const index = text.indexOf(token)
  if (index < 0) return null
  const startsWord = index === 0 || text[index - 1] === ' '
  return startsWord ? 0 : 0.1
}

const MIN_FUZZY_TOKEN_LENGTH = 4

// Palavras que quase ninguém escreve no nome de um ténis ("ténis nike",
// "sapatilhas adidas"): são ignoradas, desde que sobre pelo menos outra
// palavra para pesquisar.
const IGNORED_WORDS = new Set(['tenis', 'sapatilha', 'sapatilhas', 'sneaker', 'sneakers', 'de', 'da', 'do', 'para', 'e'])

// Genérica: funciona com o produto completo (grelha do catálogo) e com a
// versão reduzida do seletor do /comparar - só precisa do nome e da marca.
export function searchProducts<T extends Searchable>(products: T[], query: string, limit?: number): T[] {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const allTokens = normalizeSearchText(trimmed).split(' ').filter(Boolean)
  const meaningful = allTokens.filter((token) => !IGNORED_WORDS.has(token))
  const tokens = meaningful.length > 0 ? meaningful : allTokens
  if (tokens.length === 0) return []

  // 1.ª tentativa: todas as palavras aparecem tal como foram escritas.
  let matches: { item: T; score: number; position: number }[] = []
  products.forEach((item, position) => {
    const text = textOf(item)
    let score = 0
    for (const token of tokens) {
      const tokenScore = exactScore(text, token)
      if (tokenScore === null) return
      score += tokenScore
    }
    matches.push({ item, score, position })
  })

  // 2.ª tentativa (só se a primeira não encontrou nada): aceita erros de
  // escrita nas palavras maiores.
  if (matches.length === 0 && tokens.some((token) => token.length >= MIN_FUZZY_TOKEN_LENGTH)) {
    const entries = products.map((item, position) => ({ item, position, text: textOf(item) }))
    const fuse = new Fuse(entries, {
      keys: ['text'],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
    })
    const fuzzyByToken = new Map<string, Map<number, number>>()
    for (const token of tokens) {
      if (token.length < MIN_FUZZY_TOKEN_LENGTH) continue
      const scores = new Map<number, number>()
      for (const result of fuse.search(token)) scores.set(result.item.position, result.score ?? 0)
      fuzzyByToken.set(token, scores)
    }
    for (const entry of entries) {
      let score = 0
      let ok = true
      for (const token of tokens) {
        const tokenScore = exactScore(entry.text, token)
        if (tokenScore !== null) {
          score += tokenScore
          continue
        }
        const fuzzy = fuzzyByToken.get(token)?.get(entry.position)
        if (fuzzy === undefined) {
          ok = false
          break
        }
        score += 0.2 + fuzzy
      }
      if (ok) matches.push({ item: entry.item, score, position: entry.position })
    }
  }

  // Melhores primeiro; empatados ficam pela ordem original do catálogo.
  matches = matches.sort((a, b) => a.score - b.score || a.position - b.position)
  const items = matches.map((m) => m.item)
  return limit != null ? items.slice(0, limit) : items
}
