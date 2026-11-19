// scripts/import-ulanka.mjs
//
// Importa os ténis desportivos e de lifestyle da Ulanka (loja espanhola) a
// partir do ficheiro de produtos da Tradedoubler (feed 258453, ~1.700 linhas -
// uma por tamanho, com roupa, velas, acessórios e calçado de moda). Corre no
// GitHub Actions (.github/workflows/import-ulanka.yml), com a chave da
// Tradedoubler guardada nos "secrets" do repositório (TRADEDOUBLER_TOKEN).
//
// Funciona como o importador da Direct-Volley (scripts/import-directvolley.mjs)
// e lê da base de dados só o que precisa, por causa do limite de tráfego do
// plano gratuito do Supabase:
//   1. Só fica com SAPATILHAS/TÉNIS (nome com "sneakers", "trainers",
//      "zapatillas"...). Chinelos, sandálias, socas ("clogs"), botas,
//      mocassins, pantufas, espadrilhas, atacadores, acessórios e roupa
//      ficam de fora. A marca própria da loja (Ulanka, ULK) também: não tem
//      com que comparar.
//   2. O ficheiro NÃO traz categoria, género nem cor: a categoria do Parjusto
//      sai de palavras do nome ("running", "trail", "walk", "training"...;
//      senão "lifestyle"), o género de palavras do nome/descrição (senão
//      "unissexo") e a cor só quando o nome a diz. Nada é inventado: o que
//      não se sabe fica por preencher.
//   3. Junta as linhas de cada artigo (g:item_group_id) e procura se o ténis
//      já existe no Parjusto pelo código de barras (EAN) - quase todas as
//      linhas têm um GTIN de 1 dígito (vazio), por isso só contam os de 12 a
//      14 dígitos. Os dados dos ténis que já existem NÃO são alterados, só se
//      juntam ofertas.
//   4. Ténis novos: cria o ténis (marca, modelo, categoria, género, foto da
//      loja) e uma oferta por tamanho. Ficam sempre ESCONDIDOS até a foto
//      estar tratada (e, se for caso disso, até o Jorge aprovar).
//   5. O ficheiro traz também os tamanhos esgotados ("out of stock"), que
//      ficam guardados como esgotados; os que deixam de aparecer ficam
//      esgotados.
//   6. Trata a foto principal (fundo igual ao do Parjusto, ténis inteiro -
//      ver feed-photos.mjs).
//
// Os endereços de compra guardados são os da própria loja (sem os
// parâmetros de campanha utm). O link de afiliado liga-se mais tarde, no
// "template" da loja (stores.affiliate_url_template), depois de o Jorge
// aprovar - nunca aparece o nome da loja/rede como parceiro no site.
//
// Modos (variável MODE): test (até LIMIT ténis novos ESCONDIDOS, variados;
// não escreve ofertas em ténis que já existem), full (tudo; com
// ACTIVATE_NEW=true ficam visíveis os que têm foto tratada e stock), photos
// (só as fotos) e review (não altera nada: guarda uma folha com as fotos dos
// ténis escondidos em product-photos/_review/). Resumo de cada execução:
// tabela import_runs.
import { streamProducts } from './feed-stream.mjs'
import { processAndUploadBest, uploadPhoto } from './feed-photos.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TD_TOKEN = process.env.TRADEDOUBLER_TOKEN
const FEED_ID = process.env.TD_FEED_ID || '258453'
const MODE = process.env.MODE || 'test'
const LIMIT = Number(process.env.LIMIT || 50)
const ACTIVATE_NEW = process.env.ACTIVATE_NEW === 'true'
const PHOTO_LIMIT = Number(process.env.PHOTO_LIMIT || 2000)
const SOURCE = 'ulanka'
const STORE_SLUG = 'ulanka'
const MIN_PRICE = 10 // abaixo disto num sapato é quase de certeza um erro do ficheiro

for (const [v, n] of [[SUPABASE_URL, 'SUPABASE_URL'], [SUPABASE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'], [MODE === 'photos' || MODE === 'review' ? 'x' : TD_TOKEN, 'TRADEDOUBLER_TOKEN']]) {
  if (!v) { console.error('Falta a variável ' + n); process.exit(1) }
}
if (!['test', 'full', 'photos', 'review'].includes(MODE)) { console.error('Modo desconhecido: ' + MODE); process.exit(1) }

// ---------------------------------------------------------------- Supabase
const H = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function sb(path, { method = 'GET', body, prefer, range } = {}) {
  const headers = { ...H }
  if (prefer) headers.Prefer = prefer
  if (range) headers.Range = range
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
    if (r.ok) {
      const text = await r.text()
      return text ? JSON.parse(text) : null
    }
    const err = await r.text()
    if (attempt < 3 && r.status >= 500) { await sleep(2000 * attempt); continue }
    throw new Error('Supabase ' + method + ' ' + path.split('?')[0] + ': HTTP ' + r.status + ' ' + err.slice(0, 300))
  }
}

async function sbAll(path) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const rows = await sb(path, { range: from + '-' + (from + 999) })
    out.push(...rows)
    if (rows.length < 1000) return out
  }
}

// Lê só as linhas pedidas: "values" em pedaços de "size" para o filtro in.(...)
async function sbIn(table, column, values, select, size = 150) {
  const out = []
  for (let i = 0; i < values.length; i += size) {
    const chunk = values.slice(i, i + size)
    const list = chunk.map((v) => '"' + String(v).replace(/"/g, '') + '"').join(',')
    out.push(...(await sb(table + '?' + column + '=in.(' + list + ')&select=' + select)))
  }
  return out
}

async function sbInsertChunks(table, rows, { onConflict, ignore = false, returning = false, size = 500 } = {}) {
  const out = []
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size)
    const q = onConflict ? '?on_conflict=' + onConflict : ''
    const prefer = [returning ? 'return=representation' : 'return=minimal', onConflict ? (ignore ? 'resolution=ignore-duplicates' : 'resolution=merge-duplicates') : null].filter(Boolean).join(',')
    const res = await sb(table + q, { method: 'POST', body: chunk, prefer })
    if (returning && res) out.push(...res)
  }
  return out
}

// ------------------------------------------------------------------ Regras
export function slugify(s) {
  return String(s)
    .replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/ø/g, 'o').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const field = (p, name) => {
  const v = (p.fields || []).find((f) => f.name === name)?.value
  return v && v !== 'undefined' ? String(v) : null
}

// Marca própria da loja: não entra.
// Ligação de afiliado da Tradedoubler (programa 398192, site 3501899).
const AFFILIATE_TEMPLATE = 'https://clk.tradedoubler.com/click?p=398192&a=3501899&url={url}'
const OWN_BRANDS = /^(ulanka|ulk)$/i
// É ténis: o nome diz "sneakers", "trainers", "zapatillas"...
const SNEAKER_RE = /sneaker|trainer|zapatilla|runner|running|baskets?\b|tenis|tênis/i
// Não é ténis, mesmo que o nome tenha uma das palavras acima.
const NOT_SNEAKER_RE = /clog|sandal|\bboots?\b|bota|loafer|mocas|slipper|pantufa|flip.?flop|sabot|zueco|espadrille|slide|ballerina|heel|wedge|abotinad|bot[ií]n|botines|chancl|alpargata|chinela|\bmules?\b|oxford|derby|moccasin|sock|shoelace|\blaces\b|charm|jibbitz|insole|plantilla|candle|sunglass|\bbag\b|jacket|jeans|sweater|shirt|hoodie|\bcap\b|beanie/i

// "Marca Modelo - Tipo, 40" -> { base: "Marca Modelo", type: "Tipo" }
function splitName(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim()
  const noSize = n.replace(/,\s*[0-9][0-9.,\/ ]*$/, '').trim()
  const i = noSize.lastIndexOf(' - ')
  return i > 0 ? { base: noSize.slice(0, i).trim(), type: noSize.slice(i + 3).trim() } : { base: noSize, type: '' }
}

export function isWantedSneaker(name, brand) {
  if (OWN_BRANDS.test(String(brand || '').trim())) return false
  const n = String(name || '')
  return SNEAKER_RE.test(n) && !NOT_SNEAKER_RE.test(n)
}

// Categoria do Parjusto (filtro do catálogo), só por palavras do nome.
export function mapCategory(name) {
  const n = String(name || '').toLowerCase()
  if (/\btrail\b/.test(n)) return 'trail'
  if (/futsal|indoor|football|soccer|f[uú]tbol/.test(n)) return 'futebol'
  if (/running|runner|go run|\brun\b/.test(n)) return 'running'
  if (/go walk|\bwalk|hiking|trekking/.test(n)) return 'caminhada'
  if (/training|trainer\s+(gym|fit)|gym|workout|fitness/.test(n)) return 'treino'
  if (/tennis|padel|basket|volley|handball/.test(n)) return 'desporto'
  return 'lifestyle'
}

export function mapGender(name, description, ageGroup, sizes) {
  const text = (String(name || '') + ' ' + String(description || '')).toLowerCase()
  const nums = sizes.map((s) => parseFloat(s)).filter((x) => Number.isFinite(x))
  if (/\b(kids?|junior|jr|children|toddler|infant|ni[ñn]os?|ni[ñn]as?)\b/.test(text) || /kid|child|infant|toddler/i.test(String(ageGroup || '')) || (nums.length && Math.max(...nums) < 35)) return 'crianca'
  if (/\bunisex\b/.test(text)) return 'unissexo'
  const w = /\b(women'?s?|woman|ladies|female|mujer|damas?)\b/.test(text)
  const m = /\b(men'?s?|man|male|hombre)\b/.test(text)
  if (w && !m) return 'mulher'
  if (m && !w) return 'homem'
  return 'unissexo'
}

// Cor: só quando o nome a diz (o ficheiro não tem campo de cor).
const COLOR_WORDS = [
  [/\b(black|negr[oa]s?|noir)\b/i, 'Preto'], [/\b(white|blanc[oa]s?)\b/i, 'Branco'], [/\b(grey|gray|gris(?:es)?)\b/i, 'Cinzento'],
  [/\b(blue|azul(?:es)?|navy|marino)\b/i, 'Azul'], [/\b(red|roj[oa]s?|burdeos|granate)\b/i, 'Vermelho'], [/\b(green|verdes?|kaki|khaki|caqui|lima)\b/i, 'Verde'],
  [/\b(yellow|amarill[oa]s?|mostaza)\b/i, 'Amarelo'], [/\b(orange|naranjas?)\b/i, 'Laranja'], [/\b(pink|rosas?|fucsia)\b/i, 'Rosa'],
  [/\b(purple|morad[oa]s?|violeta|lila)\b/i, 'Roxo'], [/\b(brown|marr[oó]n(?:es)?|camel|tostad[oa]s?|chocolate)\b/i, 'Castanho'],
  [/\b(beige|cream|crema|crudo|sand|arena|nude)\b/i, 'Bege'],
]
export function colorFromName(name) {
  for (const [re, pt] of COLOR_WORDS) if (re.test(name)) return pt
  return null
}

// "40" -> "40"; "40,5" -> "40.5"; "EU 40" -> "40". Outros (S, M, L, "One size") não entram.
export function normSize(s) {
  const v = String(s || '').trim().replace(/^eu\s*/i, '').replace(/,/g, '.').replace(/\s+/g, ' ')
  return /^\d{2}(\.5)?( [12]\/3)?$/.test(v) ? v : null
}

export function ean13(e) {
  const s = String(e || '').replace(/\D/g, '')
  if (s.length < 12 || s.length > 14 || /^(\d)\1+$/.test(s)) return null
  return s.length < 13 ? s.padStart(13, '0') : s
}

function titleCaseIfShouting(s) {
  return s === s.toUpperCase() && s.length > 4 ? s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s
}

function fixCaps(m) {
  if (!/[A-ZÀ-Ý]{4,}/.test(m)) return m
  return m.split(' ').map((w) => (/^[A-ZÀ-Ý]{4,}$/.test(w) ? w.charAt(0) + w.slice(1).toLowerCase() : w)).join(' ')
}

function titleCaseIfAllLower(s) {
  return s === s.toLowerCase() ? s.replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Xl|Og|Gs|Gt)\b/g, (w) => w.toUpperCase()) : s
}

// O nome da loja vem em inglês e em espanhol ("Zapatillas Deportivas
// GEL-1130 Blanca", "Casual De Piel Marrones", "Club C men's white"). Fica só
// o nome do modelo ("GEL-1130", "Club C"); tira a marca, o tipo de calçado, o
// público e as cores (a cor tem campo próprio). Quando o nome é só uma
// descrição, sem nome de modelo, traduz-se para português ("Sapatilha casual
// em pele").
const REMOVE_WORDS = new Set(['sneakers', 'sneaker', 'trainers', 'trainer', 'zapatillas', 'zapatilla', 'shoes', 'shoe', 'running', 'runner', 'runners', 'deportivas', 'deportiva', 'tenis', 'women', "women's", 'womens', 'woman', 'men', "men's", 'mens', 'man', 'mujer', 'mujeres', 'hombre', 'hombres', 'niño', 'niños', 'niña', 'niñas', 'kids', 'kid', 'junior', 'unisex', 'infantil', 'infantiles', 'ladies', 'for', 'the', '-'])
const FUNCTION_WORDS = new Set(['de', 'del', 'con', 'y', 'e', 'en', 'para', 'and', 'sin', 'a', 'la', 'el', 'los', 'las'])
const FN_PT = { de: 'de', del: 'do', con: 'com', y: 'e', e: 'e', en: 'em', para: 'para', and: 'e', sin: 'sem', a: 'a', la: 'a', el: 'o', los: 'os', las: 'as' }
const MATERIALS = new Set(['pele', 'camurça', 'lona', 'tecido'])
const PT_WORDS = {
  casual: 'casual', piel: 'pele', cuero: 'pele', leather: 'pele', ante: 'camurça', suede: 'camurça', lona: 'lona', canvas: 'lona', tela: 'tecido',
  plataforma: 'plataforma', cordones: 'atacadores', anchos: 'largos', cierre: 'fecho', cierres: 'fechos', cremallera: 'fecho', cremalleras: 'fechos',
  laterales: 'laterais', lateral: 'lateral', bordado: 'bordado', ajuste: 'ajuste', 'rápido': 'rápido', rapido: 'rápido',
  'ecológicas': 'ecológica', 'ecológica': 'ecológica', ecologicas: 'ecológica', ecologica: 'ecológica', perforados: 'perfurada', perforadas: 'perfurada', perforado: 'perfurada',
  'caña': 'cano', cana: 'cano', baja: 'baixo', bajas: 'baixo', media: 'médio', alta: 'alto', detalles: 'detalhes', detalle: 'detalhe', retro: 'retro', chunky: 'chunky',
  plateadas: 'prateada', plateado: 'prateado', plateados: 'prateado', doradas: 'dourada', dorado: 'dourado', dorados: 'dourado',
}
const isColorWord = (w) => COLOR_WORDS.some(([re]) => re.test(w))

export function modelName(nameBase, brandName) {
  let s = String(nameBase || '').replace(/’/g, "'").replace(/\s+/g, ' ').trim()
  const brandWords = String(brandName || '').split(/\s+/).filter((w) => w.length > 1).map((w) => w.toLowerCase())
  s = s.replace(/\b(faux|vegan) leather\b/gi, 'pele sintética').replace(/\b(piel|cuero) sint[ée]tica\b/gi, 'pele sintética').replace(/\bde (piel|cuero)\b/gi, 'em pele')
  const nameLike = []
  const desc = []
  let sawSport = false
  for (const raw of s.split(' ').filter(Boolean)) {
    const t = raw.replace(/^[,;:()]+|[,;:()]+$/g, '')
    const lc = t.toLowerCase()
    if (!t || brandWords.includes(lc)) continue
    if (lc === 'deportivas' || lc === 'deportiva') sawSport = true
    if (REMOVE_WORDS.has(lc)) continue
    if (isColorWord(t)) continue
    if (lc === 'em' || lc === 'sintética') { desc.push(lc); continue }
    if (lc === 'suede' && brandWords.includes('puma')) { nameLike.push(t); desc.push(t); continue }
    if (lc === 'pele' || PT_WORDS[lc]) {
      const w = lc === 'pele' ? 'pele' : PT_WORDS[lc]
      if (MATERIALS.has(w) && desc.length && !['em', 'de', 'do', 'com', 'sem'].includes(desc[desc.length - 1])) desc.push('em')
      desc.push(w)
      continue
    }
    if (FUNCTION_WORDS.has(lc)) { desc.push(FN_PT[lc]); continue }
    nameLike.push(t)
    desc.push(t)
  }
  if (nameLike.length) return fixCaps(titleCaseIfAllLower(nameLike.join(' ').trim()))
  while (desc.length && ['de', 'do', 'com', 'e', 'em', 'para', 'sem', 'a', 'o', 'as', 'os'].includes(desc[desc.length - 1])) desc.pop()
  while (desc.length && ['e', 'com', 'para', 'sem'].includes(desc[0])) desc.shift()
  let phrase = desc.join(' ').replace(/\bpele sintética\b/g, 'pele sintética').replace(/\bem em\b/g, 'em')
  if (/^(pele|camurça|lona|tecido)\b/.test(phrase)) phrase = 'em ' + phrase
  if (!phrase && sawSport) phrase = 'desportiva'
  return phrase ? 'Sapatilha ' + phrase : 'Sapatilha'
}

// Se o nome da loja não traz o modelo ("Zapatillas blancas de running ASICS"),
// o modelo costuma estar no endereço da página ("...-asics-gel-1130"): usa-se
// o mesmo tratamento sobre as palavras do endereço.
function slugWords(u) {
  try { return (new URL(u).pathname.split('/').filter(Boolean).pop() || '').replace(/[-_]+/g, ' ') } catch { return '' }
}
const isDescriptive = (m) => /^Sapatilha( |$)/.test(m)
export function bestModelName(name, brand, rows) {
  const m = modelName(splitName(name).base, brand)
  const bad = (x) => isDescriptive(x) || /^\d{1,2}$/.test(x)
  if (!bad(m)) return m
  const u = (rows || []).find((r) => r.url)?.url
  const alt = u ? modelName(slugWords(u), brand) : m
  if (!bad(alt)) return alt
  return isDescriptive(m) ? m : isDescriptive(alt) ? alt : 'Sapatilha'
}

// O endereço de compra vem dentro do link da Tradedoubler: url(<endereço>).
// Fica só o da loja, sem os parâmetros de campanha (utm_*).
export function directUrl(productUrl) {
  if (!productUrl) return null
  const m = String(productUrl).match(/url\((.+)\)$/)
  let raw = m ? m[1] : productUrl
  try { raw = decodeURIComponent(raw) } catch { return null }
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' || !/(^|\.)ulanka\.com$/.test(u.hostname)) return null
    for (const k of [...u.searchParams.keys()]) if (/^utm_/i.test(k)) u.searchParams.delete(k)
    return u.toString()
  } catch { return null }
}

// ----------------------------------------------------------- Descarregar
async function download() {
  const url = 'https://api.tradedoubler.com/1.0/productsUnlimited.json;fid=' + FEED_ID + '?token=' + TD_TOKEN
  for (let attempt = 1; attempt <= 30; attempt++) {
    const res = await fetch(url)
    if (res.status === 200) return res
    const body = await res.text().catch(() => '')
    console.log('Tentativa ' + attempt + ': HTTP ' + res.status + ' ' + body.slice(0, 120))
    if (res.status !== 202) throw new Error('HTTP ' + res.status)
    await sleep(60_000)
  }
  throw new Error('O ficheiro não ficou pronto a tempo')
}

// ------------------------------------------------------------------ Revisão
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function reviewSheet() {
  const { default: sharp } = await import('sharp')
  const rows = await sb('products?source=eq.' + SOURCE + '&is_active=eq.false&select=id,slug,model_name,color,category,gender,image_url,brands(name),product_offers(price,size,in_stock)&order=created_at.desc&limit=60')
  const items = rows.map((p) => {
    const prices = (p.product_offers ?? []).map((o) => Number(o.price))
    return { ...p, from: prices.length ? Math.min(...prices) : null, sizes: (p.product_offers ?? []).length }
  })
  console.log('Ténis escondidos da Ulanka: ' + items.length)
  for (const p of items) console.log('REVISAO | ' + p.slug + ' | ' + p.brands?.name + ' | ' + p.model_name + ' | ' + p.color + ' | ' + p.gender + ' | ' + p.category + ' | desde ' + p.from + ' € | ' + p.sizes + ' tamanhos')
  const COLS = 5, W = 260, IMG = 200, H = 310
  const rowsN = Math.ceil(items.length / COLS)
  const layers = []
  for (let i = 0; i < items.length; i++) {
    const p = items[i]
    const x = (i % COLS) * W
    const y = Math.floor(i / COLS) * H
    try {
      const res = await fetch(p.image_url)
      const img = await sharp(Buffer.from(await res.arrayBuffer())).resize(W - 8, IMG, { fit: 'contain', background: '#F9FAFB' }).flatten({ background: '#F9FAFB' }).png().toBuffer()
      layers.push({ input: img, left: x + 4, top: y + 4 })
    } catch (e) { console.log('sem foto tratada: ' + p.slug) }
    const lines = [
      [String(p.brands?.name ?? '').slice(0, 30), 12, 400],
      [String(p.model_name).slice(0, 30), 15, 700],
      [(String(p.color || '-') + ' · ' + p.gender).slice(0, 34), 12, 400],
      [(p.category + ' · desde ' + p.from + ' € · ' + p.sizes + ' tam.').slice(0, 38), 12, 400],
    ]
    const text = lines.map(([t, size, weight], k) => '<text x="10" y="' + (22 + k * 20) + '" font-family="DejaVu Sans, Arial, sans-serif" font-size="' + size + '" font-weight="' + weight + '" fill="#17232B">' + esc(t) + '</text>').join('')
    layers.push({ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + (H - IMG - 8) + '">' + text + '</svg>'), left: x, top: y + IMG + 8 })
  }
  const sheet = await sharp({ create: { width: COLS * W, height: Math.max(1, rowsN) * H, channels: 3, background: '#FFFFFF' } }).composite(layers).webp({ quality: 82 }).toBuffer()
  const path = '_review/ulanka-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + '.webp'
  console.log('FOLHA ' + (await uploadPhoto({ supabaseUrl: SUPABASE_URL, key: SUPABASE_KEY, path, buffer: sheet })))
}

// ------------------------------------------------------------------ Main
async function main() {
  if (MODE === 'review') {
    try { await reviewSheet() } catch (e) { console.error(String(e?.stack || e)); process.exitCode = 1 }
    process.exit(process.exitCode || 0)
  }

  const t0 = Date.now()
  const now = new Date().toISOString()
  const report = { mode: MODE, limit: LIMIT, activateNew: ACTIVATE_NEW, rows: 0, sneakerRows: 0, excludedOwnBrand: 0, badSize: 0, groups: 0, created: 0, createdOffers: 0, updatedOffers: 0, priceChanges: 0, markedOutOfStock: 0, matchedExisting: 0, matchedOwn: 0, offersOnExisting: 0, skippedNoPrice: 0, skippedLowPrice: 0, withValidGtin: 0, mpnMatchesInfo: 0, photosDone: 0, photosFailed: 0, activated: 0, deactivated: 0, photoErrors: [], nameCheck: [], newBrands: [], categories: {}, genders: {}, brands: {}, matchedBySource: {}, created_slugs: [], errors: [] }
  const inc = (o, k) => { o[k] = (o[k] || 0) + 1 }
  const redact = (s) => String(s).split(TD_TOKEN || '###').join('***')

  try {
    // 1) A loja (criada na primeira vez; o ficheiro não traz portes nem limite
    // de portes grátis: ficam por preencher até o Jorge os confirmar.)
    let store = (await sb('stores?slug=eq.' + STORE_SLUG + '&select=id,slug,name'))[0]
    if (!store && MODE !== 'photos') {
      store = (await sb('stores', { method: 'POST', body: { slug: STORE_SLUG, name: 'Ulanka', base_url: 'https://ulanka.com' }, prefer: 'return=representation' }))[0]
      console.log('Loja Ulanka criada')
    }
    // Links de afiliado (Tradedoubler): AFFILIATE_LINKS=on liga, off desliga,
    // vazio não mexe.
    if (store && (process.env.AFFILIATE_LINKS === 'on' || process.env.AFFILIATE_LINKS === 'off')) {
      const template = process.env.AFFILIATE_LINKS === 'on' ? AFFILIATE_TEMPLATE : null
      await sb('stores?id=eq.' + store.id, { method: 'PATCH', body: { affiliate_url_template: template }, prefer: 'return=minimal' })
      console.log('Links de afiliado da Ulanka: ' + (template ? 'LIGADOS' : 'desligados'))
    }
    const brands = await sbAll('brands?select=id,slug,name')
    const brandBySlug = new Map(brands.map((b) => [b.slug, b]))

    if (MODE !== 'photos') {
      // 2) Ler o ficheiro e juntar as linhas (uma por tamanho) por artigo
      const groups = new Map()
      const res = await download()
      for await (const raw of streamProducts(res)) {
        report.rows++
        let p
        try { p = JSON.parse(raw) } catch { continue }
        const brand = String(p.brand || '').trim()
        if (OWN_BRANDS.test(brand)) { report.excludedOwnBrand++; continue }
        if (!isWantedSneaker(p.name, brand)) continue
        const size = normSize(field(p, 'g:size'))
        if (!size) { report.badSize++; continue }
        report.sneakerRows++
        const gid = String(field(p, 'g:item_group_id') || p.name).trim()
        let g = groups.get(gid)
        if (!g) { g = { id: gid, first: p, rows: [] }; groups.set(gid, g) }
        const offer = p.offers?.[0]
        const price = Number(offer?.priceHistory?.[0]?.price?.value)
        g.rows.push({
          size,
          ean: ean13(field(p, 'g:gtin')),
          price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
          url: directUrl(offer?.productUrl),
          inStock: /^in stock/i.test(String(offer?.availability || '')),
        })
      }
      console.log('Ficheiro: ' + report.rows + ' linhas, ' + report.sneakerRows + ' de ténis, ' + groups.size + ' artigos')

      // 3) Procurar o que já existe no Parjusto (só pelos códigos de barras
      // deste ficheiro, em pedaços)
      const allEans = [...new Set([...groups.values()].flatMap((g) => g.rows.map((r) => r.ean).filter(Boolean)))]
      report.withValidGtin = allEans.length
      const gtinRows = await sbIn('product_gtins', 'ean', allEans, 'ean,product_id', 200)
      const productByEan = new Map(gtinRows.map((r) => [r.ean, r.product_id]))
      const ownProducts = await sbAll('products?source=eq.' + SOURCE + '&select=id,slug,source_ref,is_active,model_name,color,category,gender')
      const ownByRef = new Map(ownProducts.map((p) => [p.source_ref, p]))
      const matchedIds = [...new Set(gtinRows.map((r) => r.product_id))]
      const matchedProducts = await sbIn('products', 'id', matchedIds, 'id,source,is_active', 100)
      const productById = new Map(matchedProducts.map((p) => [p.id, p]))
      // Só informação: quantos números de artigo do ficheiro coincidem com os do
      // Parjusto (não se usam para juntar ténis: o código da loja pode não ser o
      // do fabricante).
      const mpns = [...new Set([...groups.values()].map((g) => field(g.first, 'g:mpn')).filter(Boolean))]
      report.mpnMatchesInfo = (await sbIn('products', 'article_code', mpns, 'id', 100)).length
      const storeOffers = store ? await sbAll('product_offers?store_id=eq.' + store.id + '&select=id,product_id,size,price,in_stock') : []

      const toCreate = []
      const refresh = []
      const offerUpserts = []
      const gtinUpserts = []
      const seenOfferKeys = new Set()
      for (const g of groups.values()) {
        report.groups++
        const priced = g.rows.filter((r) => r.price && r.url)
        const gRows = priced.filter((r) => r.price >= MIN_PRICE)
        if (priced.length === 0) { report.skippedNoPrice++; continue }
        if (gRows.length === 0) { report.skippedLowPrice++; continue }

        let productId = ownByRef.get(g.id)?.id
        if (!productId) {
          const votes = new Map()
          for (const r of gRows) if (r.ean && productByEan.has(r.ean)) votes.set(productByEan.get(r.ean), (votes.get(productByEan.get(r.ean)) || 0) + 1)
          productId = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
        }
        if (productId) {
          const prod = productById.get(productId)
          if (prod?.source === SOURCE || ownByRef.has(g.id)) report.matchedOwn++
          else { report.matchedExisting++; inc(report.matchedBySource, prod?.source || 'manual') }
          if (MODE === 'test') continue
          // Ténis desta loja ainda escondidos: acerta nome, cor, categoria e
          // género com as regras atuais (os visíveis não se mexem).
          const own = ownByRef.get(g.id)
          if (MODE === 'full' && own && !own.is_active) {
            const q = g.first
            const want = { model_name: bestModelName(q.name, q.brand, g.rows), color: colorFromName(q.name), category: mapCategory(q.name), gender: mapGender(q.name, q.description, field(q, 'g:age_group'), gRows.map((r) => r.size)) }
            const patch = {}
            for (const k of Object.keys(want)) if (own[k] !== want[k]) patch[k] = want[k]
            if (Object.keys(patch).length) {
              if ('color' in patch) patch.base_colors = patch.color ? [patch.color] : []
              refresh.push({ id: own.id, patch })
            }
          }
          for (const r of gRows) {
            const key = productId + '|' + r.size
            if (seenOfferKeys.has(key)) continue
            seenOfferKeys.add(key)
            offerUpserts.push({ product_id: productId, store_id: store.id, size: r.size, price: r.price, currency: 'EUR', affiliate_url: r.url, in_stock: r.inStock, last_checked_at: now })
            if (r.ean && !productByEan.has(r.ean)) { gtinUpserts.push({ ean: r.ean, product_id: productId, size: r.size }); productByEan.set(r.ean, productId) }
          }
          continue
        }
        const p = g.first
        const sizes = gRows.map((r) => r.size)
        toCreate.push({ g, rows: gRows, category: mapCategory(p.name), gender: mapGender(p.name, p.description, field(p, 'g:age_group'), sizes) })
      }

      // Modo teste: LIMIT ténis variados - alternando marcas e, dentro de cada
      // marca, categorias e géneros (no máximo 6 por marca).
      let createList = toCreate
      if (MODE === 'test') {
        const byBrand = new Map()
        for (const c of toCreate) {
          const brand = slugify(c.g.first.brand)
          const k = c.category + '|' + c.gender
          if (!byBrand.has(brand)) byBrand.set(brand, new Map())
          const m = byBrand.get(brand)
          if (!m.has(k)) m.set(k, [])
          m.get(k).push(c)
        }
        const perBrand = []
        for (const m of byBrand.values()) {
          const lists = [...m.values()].map((l) => l.sort((a, b) => b.rows.length - a.rows.length))
          const picked = []
          for (let i = 0; picked.length < 6 && lists.some((l) => i < l.length); i++) {
            for (const l of lists) if (i < l.length && picked.length < 6) picked.push(l[i])
          }
          perBrand.push(picked)
        }
        perBrand.sort((a, b) => b.length - a.length)
        createList = []
        for (let i = 0; createList.length < LIMIT && perBrand.some((l) => i < l.length); i++) {
          for (const l of perBrand) if (i < l.length && createList.length < LIMIT) createList.push(l[i])
        }
      }

      // 4b) Acertar os escondidos já existentes
      for (const x of refresh) {
        await sb('products?id=eq.' + x.id, { method: 'PATCH', body: { ...x.patch, updated_at: now }, prefer: 'return=minimal' })
      }
      report.refreshed = refresh.length

      // 5) Marcas novas
      const newBrandRows = []
      const brandOf = (name) => slugify(String(name).trim())
      for (const c of createList) {
        const bname = String(c.g.first.brand || '').trim()
        const slug = brandOf(bname)
        if (slug && !brandBySlug.has(slug) && !newBrandRows.some((b) => b.slug === slug)) newBrandRows.push({ slug, name: titleCaseIfShouting(bname) })
      }
      if (newBrandRows.length) {
        // o nome também é único: evitar choque com marcas com o mesmo nome
        const names = new Set(brands.map((b) => b.name.toLowerCase()))
        const rows = newBrandRows.map((b) => (names.has(b.name.toLowerCase()) ? { ...b, name: b.name + ' (' + b.slug + ')' } : b))
        await sbInsertChunks('brands', rows, { onConflict: 'slug', ignore: true })
        for (const b of await sbAll('brands?select=id,slug,name')) brandBySlug.set(b.slug, b)
        report.newBrands = rows.map((b) => b.name)
      }

      // 6) Criar os ténis novos (endereços sem repetir os que já existem)
      const candidates = createList.map((c) => {
        const p = c.g.first
        const brand = brandBySlug.get(brandOf(p.brand))
        const model = bestModelName(p.name, p.brand, c.rows)
        const color = colorFromName(p.name)
        const base = slugify((brand?.name ?? p.brand) + ' ' + model + ' ' + (color || '') + ' ' + (c.gender === 'crianca' ? 'crianca' : '')).slice(0, 80).replace(/-+$/, '')
        if (/[ñáéíóú]|\b(de|con|para|sin|del|y)\b/i.test(model) && report.nameCheck.length < 40) report.nameCheck.push(model + ' <- ' + String(p.name).slice(0, 80))
        return { c, p, brand, model, color, base }
      }).filter((x) => x.brand)
      // Endereços (slugs) sem repetir os que já existem na base de dados nem
      // os deste lote. Os sufixos (-2, -3...) também podem já existir, por
      // isso confirma-se a seguir e, se houver choque, passa-se ao seguinte.
      const usedSlugs = new Set((await sbIn('products', 'slug', candidates.map((x) => x.base), 'slug', 100)).map((r) => r.slug))
      const slugOf = new Map()
      for (const x of candidates) {
        let slug = x.base
        for (let n = 2; usedSlugs.has(slug); n++) slug = x.base + '-' + n
        usedSlugs.add(slug)
        slugOf.set(x, slug)
      }
      for (let round = 0; round < 20; round++) {
        const suffixed = [...slugOf.entries()].filter(([x, s]) => s !== x.base)
        if (!suffixed.length) break
        const found = new Set((await sbIn('products', 'slug', suffixed.map(([, s]) => s), 'slug', 100)).map((r) => r.slug))
        const clash = suffixed.filter(([, s]) => found.has(s))
        if (!clash.length) break
        for (const [x] of clash) {
          let slug = x.base
          for (let n = 2; usedSlugs.has(slug); n++) slug = x.base + '-' + n
          usedSlugs.add(slug)
          slugOf.set(x, slug)
        }
      }
      const newProducts = []
      const pending = []
      for (const x of candidates) {
        const { c, p, brand, model, color } = x
        const slug = slugOf.get(x)
        const photo = (p.productImage?.url || '').startsWith('https://') ? p.productImage.url : null
        if (!photo) { report.errors.push('sem foto: ' + c.g.id); continue }
        const gallery = []
        for (let k = 1; k <= 5; k++) { const u = field(p, 'additional_image_link_' + k); if (u && u.startsWith('https://') && u !== photo) gallery.push(u) }
        newProducts.push({
          brand_id: brand.id,
          model_name: model,
          slug,
          category: c.category,
          gender: c.gender,
          image_url: photo,
          image_urls: gallery,
          color,
          base_colors: color ? [color] : [],
          // sempre escondido ao criar: só fica visível depois de a foto estar tratada
          is_active: false,
          source: SOURCE,
          source_ref: c.g.id,
          created_at: now,
          updated_at: now,
        })
        pending.push(c)
        inc(report.categories, c.category)
        inc(report.genders, c.gender)
        inc(report.brands, brand.name)
      }
      const created = await sbInsertChunks('products', newProducts, { returning: true, size: 200 })
      const createdByRef = new Map(created.map((p) => [p.source_ref, p]))
      report.created = created.length
      report.created_slugs = created.slice(0, 60).map((p) => p.slug)

      const newOffers = []
      const newGtins = []
      for (const c of pending) {
        const prod = createdByRef.get(c.g.id)
        if (!prod) continue
        const sizes = new Set()
        for (const r of c.rows) {
          if (r.ean && !productByEan.has(r.ean)) { newGtins.push({ ean: r.ean, product_id: prod.id, size: r.size }); productByEan.set(r.ean, prod.id) }
          if (sizes.has(r.size)) continue
          sizes.add(r.size)
          newOffers.push({ product_id: prod.id, store_id: store.id, size: r.size, price: r.price, currency: 'EUR', affiliate_url: r.url, in_stock: r.inStock, last_checked_at: now, created_at: now })
          seenOfferKeys.add(prod.id + '|' + r.size)
        }
      }
      await sbInsertChunks('product_gtins', newGtins, { onConflict: 'ean', ignore: true })
      const insertedOffers = await sbInsertChunks('product_offers', newOffers, { onConflict: 'product_id,store_id,size', ignore: true, returning: true })
      report.createdOffers = insertedOffers.length
      await sbInsertChunks('price_history', insertedOffers.map((o) => ({ product_offer_id: o.id, price: o.price, recorded_at: now })))

      // 7) Preço e stock (só no modo full): ofertas em ténis que já existem
      // e nos ténis desta loja já importados
      if (MODE === 'full') {
        await sbInsertChunks('product_gtins', gtinUpserts, { onConflict: 'ean', ignore: true })
        const existingByKey = new Map(storeOffers.map((o) => [o.product_id + '|' + o.size, o]))
        const changedPrice = offerUpserts.filter((u) => {
          const old = existingByKey.get(u.product_id + '|' + u.size)
          return !old || Number(old.price) !== u.price
        })
        const written = await sbInsertChunks('product_offers', offerUpserts, { onConflict: 'product_id,store_id,size', returning: true })
        report.updatedOffers = written.length
        report.offersOnExisting = offerUpserts.filter((u) => productById.get(u.product_id)?.source !== SOURCE).length
        const idByKey = new Map(written.map((o) => [o.product_id + '|' + o.size, o.id]))
        const history = changedPrice.map((u) => ({ product_offer_id: idByKey.get(u.product_id + '|' + u.size), price: u.price, recorded_at: now })).filter((h) => h.product_offer_id)
        await sbInsertChunks('price_history', history)
        report.priceChanges = history.length

        // tamanhos que já não estão no ficheiro -> esgotados
        const gone = storeOffers.filter((o) => o.in_stock && !seenOfferKeys.has(o.product_id + '|' + o.size)).map((o) => o.id)
        for (let i = 0; i < gone.length; i += 200) {
          await sb('product_offers?id=in.(' + gone.slice(i, i + 200).join(',') + ')', { method: 'PATCH', body: { in_stock: false, last_checked_at: now }, prefer: 'return=minimal' })
        }
        report.markedOutOfStock = gone.length
      }
    } // fim de "if (MODE !== 'photos')"

    // 8) Fotos: tratar a foto principal dos ténis da Ulanka que ainda têm a
    // foto original da loja.
    if (MODE !== 'test' || report.created > 0) {
      const todo = (await sbAll('products?source=eq.' + SOURCE + '&image_url=not.like.*/product-photos/*&select=id,slug,image_url,image_urls&order=created_at.desc')).slice(0, PHOTO_LIMIT)
      console.log('Fotos por tratar: ' + todo.length)
      let next = 0
      async function worker() {
        while (next < todo.length) {
          const p = todo[next++]
          try {
            const cands = [p.image_url, ...(p.image_urls ?? [])].filter((u, i, all) => u && all.indexOf(u) === i)
            const { url } = await processAndUploadBest({ supabaseUrl: SUPABASE_URL, key: SUPABASE_KEY, sourceUrls: cands, path: 'ulanka/' + p.slug + '.webp' })
            const gallery = cands.slice(0, 6)
            await sb('products?id=eq.' + p.id, { method: 'PATCH', body: { image_url: url, image_urls: gallery, updated_at: new Date().toISOString() }, prefer: 'return=minimal' })
            report.photosDone++
          } catch (e) {
            report.photosFailed++
            if (report.photoErrors.length < 20) report.photoErrors.push(p.slug + ': ' + String(e?.message || e).slice(0, 120))
          }
        }
      }
      await Promise.all(Array.from({ length: 6 }, worker))
      console.log('Fotos tratadas: ' + report.photosDone + ', falharam: ' + report.photosFailed)
    }

    // 9) Visível / escondido: fica visível o ténis da Ulanka com foto tratada
    // e pelo menos um tamanho em stock (em qualquer loja); fica escondido o
    // que ficou sem stock nenhum.
    if (ACTIVATE_NEW && MODE !== 'test') {
      const imported = await sbAll('products?source=eq.' + SOURCE + '&select=id,is_active,image_url,product_offers(in_stock,discontinued_at)&order=id')
      const toOn = []
      const toOff = []
      for (const p of imported) {
        const hasStock = (p.product_offers ?? []).some((o) => o.in_stock && !o.discontinued_at)
        const photoOk = String(p.image_url || '').includes('/product-photos/')
        if (!p.is_active && hasStock && photoOk) toOn.push(p.id)
        if (p.is_active && !hasStock) toOff.push(p.id)
      }
      for (const [ids, value] of [[toOn, true], [toOff, false]]) {
        for (let i = 0; i < ids.length; i += 200) {
          await sb('products?id=in.(' + ids.slice(i, i + 200).join(',') + ')', { method: 'PATCH', body: { is_active: value, updated_at: new Date().toISOString() }, prefer: 'return=minimal' })
        }
      }
      report.activated = toOn.length
      report.deactivated = toOff.length
      console.log('Visíveis agora: +' + toOn.length + ', escondidos: ' + toOff.length)
    }
  } catch (e) {
    report.errors.push(redact(String(e?.stack || e)).slice(0, 2000))
    console.error(redact(String(e?.stack || e)))
  }

  report.seconds = Math.round((Date.now() - t0) / 1000)
  console.log(JSON.stringify({ ...report, created_slugs: undefined }, null, 1))
  try {
    await sb('import_runs', { method: 'POST', body: { source: SOURCE, mode: MODE, started_at: new Date(t0).toISOString(), finished_at: new Date().toISOString(), report }, prefer: 'return=minimal' })
  } catch (e) { console.error('Não consegui guardar o resumo:', e) }
  if (report.errors.length) process.exitCode = 1
}

if (import.meta.url === 'file://' + process.argv[1]) await main()
