// scripts/import-directvolley.mjs
//
// Importa o calçado da Direct-Volley PT a partir do ficheiro de produtos da
// Awin (feed 95032, ~207.500 linhas - uma por tamanho, quase tudo roupa).
// Corre no GitHub Actions (.github/workflows/import-directvolley.yml), com a
// chave da Awin guardada nos "secrets" do repositório (AWIN_API_KEY).
//
// Funciona como o importador da adidas (scripts/import-adidas.mjs), mas lê
// da base de dados só o que precisa (procura os ténis pelo código de barras
// em pedaços, em vez de ler as tabelas inteiras) por causa do limite de
// tráfego do plano gratuito do Supabase:
//   1. Só fica com CALÇADO: o segundo nível da categoria da loja
//      ("Desporto > Tipo > Idade > Género") diz o tipo. Ficam sapatilhas e
//      ténis (lifestyle), corrida, "indoor" (voleibol, andebol, basquetebol,
//      badmínton, squash, ténis de mesa...), ténis e padel, treino,
//      chinelos e sandálias. Ficam de fora: sacos de sapatos, protetores de
//      calçado, botas de inverno/de chuva, pantufas e botas (não são
//      desportivos). Roupa e acessórios ficam de fora.
//   2. Junta as linhas de cada modelo+cor (parent_product_id) e procura se o
//      ténis já existe no Parjusto pelo código de barras (EAN) de algum
//      tamanho - assim um ténis que já veio da adidas, da About You ou da 4
//      Elementos (ou foi criado à mão) recebe também a oferta desta loja.
//      Os dados do ténis que já existe NÃO são alterados, só se juntam
//      ofertas.
//   3. Ténis novos: cria o ténis (marca, modelo, cor em português, género,
//      categoria, foto da loja) e uma oferta por tamanho. Ficam sempre
//      ESCONDIDOS até a foto estar tratada.
//   4. Tamanhos que deixaram de aparecer no ficheiro ficam "esgotados" (o
//      ficheiro só traz o que está em stock).
//   5. Trata a foto principal (fundo igual ao do Parjusto, ténis inteiro -
//      ver feed-photos.mjs).
//
// Os endereços de compra guardados são sempre os da própria loja
// (merchant_deep_link). O link de afiliado liga-se mais tarde, no "template"
// da loja (stores.affiliate_url_template), com a variável AFFILIATE_LINKS:
// "on" liga, "off" desliga, vazia não mexe. NÃO se liga antes de o Jorge
// aprovar (e nunca aparece o nome da loja/rede como parceiro no site).
//
// Modos (variável MODE): test (até LIMIT ténis novos ESCONDIDOS, variados;
// não escreve ofertas em ténis que já existem), full (tudo; com
// ACTIVATE_NEW=true ficam visíveis os que têm foto tratada e stock), photos
// (só as fotos) e review (não altera nada: guarda uma folha com as fotos dos
// ténis escondidos em product-photos/_review/). Resumo de cada execução:
// tabela import_runs.
import { processAndUpload } from './feed-photos.mjs'
import { streamCsvRows } from './awin-csv.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const AWIN_KEY = process.env.AWIN_API_KEY
const FEED_ID = process.env.AWIN_FEED_ID || '95032'
const MODE = process.env.MODE || 'test'
const LIMIT = Number(process.env.LIMIT || 50)
const ACTIVATE_NEW = process.env.ACTIVATE_NEW === 'true'
const PHOTO_LIMIT = Number(process.env.PHOTO_LIMIT || 4000)
const SOURCE = 'direct-volley'
const STORE_SLUG = 'direct-volley'
const MIN_PRICE = 10 // abaixo disto num sapato é quase de certeza um erro do ficheiro
// Link de afiliado da Awin (programa Direct-Volley PT, conta Parjusto.pt);
// {url} é o endereço da loja, que o site codifica.
const AFFILIATE_TEMPLATE = 'https://www.awin1.com/cread.php?awinmid=85609&awinaffid=3107069&ued={url}'

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [v, n] of [[SUPABASE_URL, 'SUPABASE_URL'], [SUPABASE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'], [MODE === 'photos' || MODE === 'review' ? 'x' : AWIN_KEY, 'AWIN_API_KEY']]) {
    if (!v) { console.error(`Falta a variável ${n}`); process.exit(1) }
  }
  if (!['test', 'full', 'photos', 'review'].includes(MODE)) { console.error(`Modo desconhecido: ${MODE}`); process.exit(1) }
}

// ---------------------------------------------------------------- Supabase
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function sb(path, { method = 'GET', body, prefer, range } = {}) {
  const headers = { ...H }
  if (prefer) headers.Prefer = prefer
  if (range) headers.Range = range
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    if (r.ok) {
      const text = await r.text()
      return text ? JSON.parse(text) : null
    }
    const err = await r.text()
    if (attempt < 3 && r.status >= 500) { await sleep(2000 * attempt); continue }
    throw new Error(`Supabase ${method} ${path.split('?')[0]}: HTTP ${r.status} ${err.slice(0, 300)}`)
  }
}

async function sbAll(path) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const rows = await sb(path, { range: `${from}-${from + 999}` })
    out.push(...rows)
    if (rows.length < 1000) return out
  }
}

// Lê só as linhas pedidas: "values" em pedaços de "size" para o filtro in.(...)
async function sbIn(table, column, values, select, size = 150) {
  const out = []
  for (let i = 0; i < values.length; i += size) {
    const chunk = values.slice(i, i + size)
    const list = chunk.map((v) => `"${String(v).replace(/"/g, '')}"`).join(',')
    out.push(...(await sb(`${table}?${column}=in.(${list})&select=${select}`)))
  }
  return out
}

async function sbInsertChunks(table, rows, { onConflict, ignore = false, returning = false, size = 500 } = {}) {
  const out = []
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size)
    const q = onConflict ? `?on_conflict=${onConflict}` : ''
    const prefer = [returning ? 'return=representation' : 'return=minimal', onConflict ? (ignore ? 'resolution=ignore-duplicates' : 'resolution=merge-duplicates') : null].filter(Boolean).join(',')
    const res = await sb(`${table}${q}`, { method: 'POST', body: chunk, prefer })
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

// Categoria da loja: "Desporto > Tipo > Idade > Género".
export function parseCategory(merchantCategory) {
  const [sport = '', type = '', age = '', gender = ''] = String(merchantCategory || '').split('>').map((s) => s.trim())
  return { sport, type, age, gender }
}

// Tipos de calçado que NÃO entram (não são desportivos ou nem são sapatos).
const EXCLUDED_TYPE = /^(sac à chaussures|surchaussures|bottes d'hiver|bottes de pluie|bottes|chaussons|pantoufles)$/i
const FOOTWEAR_TYPE = /chaussure|sneaker|crampon|sandale|tong|claquette|botte|chausson|soulier/i

export function isWantedFootwear(merchantCategory) {
  const { type } = parseCategory(merchantCategory)
  return FOOTWEAR_TYPE.test(type) && !EXCLUDED_TYPE.test(type)
}

// Categoria do Parjusto (filtro do catálogo).
export function mapCategory(merchantCategory) {
  const { sport, type } = parseCategory(merchantCategory)
  if (/claquette|sandale|tong|r[ée]cup[ée]ration/i.test(type)) return 'sandalias'
  if (/chaussures de running/i.test(type) || /^running$/i.test(sport)) return 'running'
  if (/chaussures indoor/i.test(type)) return /^training$/i.test(sport) ? 'treino' : 'indoor'
  if (/halt[ée]rophilie/i.test(type) || /^training$/i.test(sport)) return 'treino'
  if (/tennis|padel/i.test(type) || /^(tennis|padel)$/i.test(sport)) return 'desporto'
  if (/^lifestyle$/i.test(sport)) return 'lifestyle'
  if (/^football$/i.test(sport)) return 'futebol'
  return 'desporto'
}

export function mapGender(customGender, customAge, sizes) {
  const age = String(customAge || '').trim().toLowerCase()
  const nums = sizes.map((s) => parseFloat(s)).filter((n) => Number.isFinite(n))
  if (age === 'junior' || age === 'baby' || (nums.length && Math.max(...nums) < 35)) return 'crianca'
  const g = String(customGender || '').trim().toLowerCase()
  if (g === 'male') return 'homem'
  if (g === 'female') return 'mulher'
  return 'unissexo'
}

// Cores: o ficheiro mistura português e francês ("Azul", "Noir", "Bleu").
const COLOR_MAP = [
  [/^(preto|noir)$/i, 'Preto'], [/^(branco|blanc)$/i, 'Branco'], [/^(cinzento|gris)$/i, 'Cinzento'],
  [/^(azul|bleu)$/i, 'Azul'], [/^(vermelho|rouge)$/i, 'Vermelho'], [/^(verde|vert)$/i, 'Verde'],
  [/^(amarelo|jaune)$/i, 'Amarelo'], [/^(laranja|orange)$/i, 'Laranja'], [/^(cor-de-rosa|rosa|rose)$/i, 'Rosa'],
  [/^(violeta|violet|roxo)$/i, 'Roxo'], [/^(castanho|marron)$/i, 'Castanho'], [/^(bege|beige)$/i, 'Bege'],
  [/^(prata|argent[ée])$/i, 'Cinzento'], [/^(dourado|dor[ée]|bronze)$/i, 'Amarelo'],
  [/^multicolor/i, 'Multicolor'],
]
export function translateColor(raw) {
  const c = String(raw || '').trim()
  if (!c) return null
  for (const [re, pt] of COLOR_MAP) if (re.test(c)) return pt
  return c.charAt(0).toUpperCase() + c.slice(1)
}

const BASE_COLORS = ['Preto', 'Branco', 'Cinzento', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Laranja', 'Rosa', 'Roxo', 'Castanho', 'Bege', 'Multicolor']
const baseColors = (color) => (BASE_COLORS.includes(color) ? [color] : [])

// "42,5" -> "42.5"; "45 1/3" fica igual (é o nome que o Parjusto já usa).
export function normSize(s) {
  return String(s || '').trim().replace(/,/g, '.').replace(/\s+/g, ' ')
}

export function ean13(e) {
  const s = String(e || '').replace(/\D/g, '')
  if (s.length < 8 || s.length > 14) return null
  return s.length < 13 ? s.padStart(13, '0') : s
}

function titleCaseIfShouting(s) {
  return s === s.toUpperCase() && s.length > 4 ? s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s
}

function fixCaps(m) {
  if (!/[A-ZÀ-Ý]{4,}/.test(m)) return m
  return m.split(' ').map((w) => (/^[A-ZÀ-Ý]{4,}$/.test(w) ? w.charAt(0) + w.slice(1).toLowerCase() : w)).join(' ')
}

// O nome da loja vem traduzido à máquina e com palavras a mais: "Sapatilhas
// de running para crianças adidas Tensaur Sport 2.0", "Calçado mulher Viper
// 5", "Tênis feminino Workout Lo", "criança sandal glitter", "padel
// Sapatilhas T.Point", "fitness basse Alyso", "Sapatos de sapateado adidas
// Adilette 2.0" (chinelos!). Fica só o nome do modelo ("Tensaur Sport 2.0"),
// como nos outros ténis do Parjusto: o tipo de calçado, o desporto e o
// género já estão na ficha. Tira, ao princípio do nome, as palavras de tipo
// de calçado, desporto e público; tira o nome da marca; e tira o público
// (criança, mulher...) onde quer que apareça.
const GENERIC_WORDS = new Set(['sapatilhas', 'sapatilha', 'sapatos', 'sapato', 'sapateado', 'ténis', 'tenis', 'tênis', 'calçado', 'calcado', 'chinelos', 'chinelo', 'chinelas', 'sandálias', 'sandalias', 'chuteiras', 'botas', 'botins', 'mocassins', 'sabrinas', 'galochas', 'pantufas', 'indoor', 'treinadora', 'treinadoras', 'fitness', 'basse', 'padel', 'running', 'corrida', 'basquetebol', 'basquete', 'voleibol', 'andebol', 'squash', 'badminton', 'badmínton', 'futsal', 'treino', 'de', 'para', 'do', 'da', 'e', 'em'])
const AUDIENCE_WORDS = new Set(['criança', 'crianças', 'crianca', 'criancas', 'mulher', 'mulheres', 'feminino', 'femininos', 'feminina', 'femininas', 'homem', 'homens', 'masculino', 'masculinos', 'masculina', 'senhora', 'senhoras', 'rapaz', 'rapazes', 'rapariga', 'raparigas', 'bebé', 'bebés', 'júnior', 'junior', 'adulto', 'adultos', 'femme', 'homme', 'enfant'])
const isNoise = (w) => GENERIC_WORDS.has(w.toLowerCase()) || AUDIENCE_WORDS.has(w.toLowerCase())

function stripLeading(words) {
  const out = [...words]
  while (out.length > 1 && isNoise(out[0])) out.shift()
  return out
}

function titleCaseIfAllLower(s) {
  return s === s.toLowerCase() ? s.replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s
}

export function modelName(productName, brandName) {
  const original = String(productName || '').replace(/\s+/g, ' ').trim()
  let words = stripLeading(original.split(' ').filter(Boolean))
  const brandWords = String(brandName || '').split(/\s+/).filter((w) => w.length > 1).map((w) => w.toLowerCase())
  const noBrand = words.filter((w) => !brandWords.includes(w.toLowerCase()))
  if (noBrand.length) words = noBrand
  words = stripLeading(words)
  const noAudience = words.filter((w) => !AUDIENCE_WORDS.has(w.toLowerCase()))
  if (noAudience.length) words = noAudience
  let n = words.join(' ').trim()
  // Só sobrou uma palavra genérica (ex.: "Sapatilhas", "Chinelos")? Usa o
  // nome da loja sem a marca, para o ténis ter ao menos um nome próprio.
  if (!n || (words.length === 1 && isNoise(words[0]))) n = original.split(' ').filter((w) => !brandWords.includes(w.toLowerCase())).join(' ').trim() || original
  return fixCaps(titleCaseIfAllLower(n)) || 'Sapatilhas'
}

// ---------------------------------------------------------- Ficheiro CSV
const COLUMNS = [
  'merchant_product_id', 'parent_product_id', 'product_name', 'brand_name', 'merchant_category', 'colour',
  'search_price', 'in_stock', 'merchant_deep_link', 'merchant_image_url', 'ean', 'mpn',
  'custom_1', 'custom_2', 'custom_3', 'delivery_cost',
]

async function openFeed() {
  const cols = encodeURIComponent(COLUMNS.join(','))
  const url = `https://productdata.awin.com/datafeed/download/apikey/${AWIN_KEY}/fid/${FEED_ID}/format/csv/language/pt/delimiter/%2C/compression/gzip/columns/${cols}/`
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url)
    if (res.ok) return res
    console.log(`Tentativa ${attempt}: HTTP ${res.status}`)
    await sleep(30_000)
  }
  throw new Error('Não consegui descarregar o ficheiro da Awin')
}

// ------------------------------------------------------------------ Revisão
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function reviewSheet() {
  const { default: sharp } = await import('sharp')
  const rows = await sb(`products?source=eq.${SOURCE}&is_active=eq.false&select=id,slug,model_name,color,category,gender,image_url,brands(name),product_offers(price,size,in_stock)&order=created_at.desc&limit=60`)
  const items = rows.map((p) => {
    const prices = (p.product_offers ?? []).map((o) => Number(o.price))
    return { ...p, from: prices.length ? Math.min(...prices) : null, sizes: (p.product_offers ?? []).length }
  })
  console.log(`Ténis escondidos da Direct-Volley: ${items.length}`)
  for (const p of items) console.log(`REVISAO | ${p.slug} | ${p.brands?.name} | ${p.model_name} | ${p.color} | ${p.gender} | ${p.category} | desde ${p.from} € | ${p.sizes} tamanhos`)
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
    } catch (e) { console.log(`sem foto tratada: ${p.slug}`) }
    const lines = [
      [`${p.brands?.name ?? ''}`.slice(0, 30), 12, 400],
      [`${p.model_name}`.slice(0, 30), 15, 700],
      [`${p.color || ''} · ${p.gender}`.slice(0, 34), 12, 400],
      [`${p.category} · desde ${p.from} € · ${p.sizes} tam.`.slice(0, 38), 12, 400],
    ]
    const text = lines.map(([t, size, weight], k) => `<text x="10" y="${22 + k * 20}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#17232B">${esc(t)}</text>`).join('')
    layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H - IMG - 8}">${text}</svg>`), left: x, top: y + IMG + 8 })
  }
  const sheet = await sharp({ create: { width: COLS * W, height: Math.max(1, rowsN) * H, channels: 3, background: '#FFFFFF' } }).composite(layers).webp({ quality: 82 }).toBuffer()
  const path = `_review/direct-volley-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.webp`
  const { uploadPhoto } = await import('./feed-photos.mjs')
  console.log(`FOLHA ${await uploadPhoto({ supabaseUrl: SUPABASE_URL, key: SUPABASE_KEY, path, buffer: sheet })}`)
}

async function main() {
  if (MODE === 'review') {
    try { await reviewSheet() } catch (e) { console.error(String(e?.stack || e)); process.exitCode = 1 }
    process.exit(process.exitCode || 0)
  }

  const t0 = Date.now()
  const now = new Date().toISOString()
  const report = { mode: MODE, limit: LIMIT, activateNew: ACTIVATE_NEW, rows: 0, footwearRows: 0, excludedRows: 0, groups: 0, created: 0, createdOffers: 0, updatedOffers: 0, priceChanges: 0, markedOutOfStock: 0, matchedExisting: 0, matchedOwn: 0, offersOnExisting: 0, skippedNoPrice: 0, skippedLowPrice: 0, photosDone: 0, photosFailed: 0, activated: 0, deactivated: 0, photoErrors: [], newBrands: [], categories: {}, genders: {}, brands: {}, matchedBySource: {}, created_slugs: [], errors: [] }
  const inc = (o, k) => { o[k] = (o[k] || 0) + 1 }

  try {
    // 1) A loja (criada na primeira vez; só com os dados que o ficheiro dá:
    // portes de 9,99 € iguais em todas as linhas. O limite de portes grátis
    // não vem no ficheiro e fica por preencher até o Jorge o confirmar.)
    let store = (await sb(`stores?slug=eq.${STORE_SLUG}&select=id,slug,name`))[0]
    if (!store && MODE !== 'photos') {
      store = (await sb('stores', { method: 'POST', body: { slug: STORE_SLUG, name: 'Direct-Volley', base_url: 'https://direct-volley.pt', shipping_base_fee: 9.99 }, prefer: 'return=representation' }))[0]
      console.log('Loja Direct-Volley criada')
    }
    if (store && (process.env.AFFILIATE_LINKS === 'on' || process.env.AFFILIATE_LINKS === 'off')) {
      const template = process.env.AFFILIATE_LINKS === 'on' ? AFFILIATE_TEMPLATE : null
      await sb(`stores?id=eq.${store.id}`, { method: 'PATCH', body: { affiliate_url_template: template }, prefer: 'return=minimal' })
      console.log(`Links de afiliado da Direct-Volley: ${template ? 'LIGADOS' : 'desligados'}`)
    }
    const brands = await sbAll('brands?select=id,slug,name')
    const brandBySlug = new Map(brands.map((b) => [b.slug, b]))

    if (MODE !== 'photos') {
      // 2) Ler o ficheiro (aos bocados) e juntar as linhas por modelo+cor
      const groups = new Map()
      for await (const p of streamCsvRows(await openFeed())) {
        report.rows++
        if (!isWantedFootwear(p.merchant_category)) {
          if (FOOTWEAR_TYPE.test(parseCategory(p.merchant_category).type)) report.excludedRows++
          continue
        }
        report.footwearRows++
        const gid = String(p.parent_product_id || p.merchant_product_id || '').trim()
        if (!gid) continue
        let g = groups.get(gid)
        if (!g) { g = { id: gid, first: p, rows: [] }; groups.set(gid, g) }
        const price = Number(p.search_price)
        g.rows.push({
          size: normSize(p.custom_1),
          ean: ean13(p.ean),
          price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
          url: (p.merchant_deep_link || '').startsWith('https://') ? p.merchant_deep_link : null,
          inStock: p.in_stock !== '0',
        })
      }
      console.log(`Ficheiro: ${report.rows} linhas, ${report.footwearRows} de calçado (excluídas: ${report.excludedRows}), ${groups.size} modelos+cor`)

      // 3) Procurar o que já existe no Parjusto (só pelos códigos de barras
      // deste ficheiro, em pedaços)
      const allEans = [...new Set([...groups.values()].flatMap((g) => g.rows.map((r) => r.ean).filter(Boolean)))]
      const gtinRows = await sbIn('product_gtins', 'ean', allEans, 'ean,product_id', 200)
      const productByEan = new Map(gtinRows.map((r) => [r.ean, r.product_id]))
      const ownProducts = await sbAll(`products?source=eq.${SOURCE}&select=id,slug,source_ref`)
      const ownByRef = new Map(ownProducts.map((p) => [p.source_ref, p]))
      const matchedIds = [...new Set(gtinRows.map((r) => r.product_id))]
      const matchedProducts = await sbIn('products', 'id', matchedIds, 'id,source,is_active', 100)
      const productById = new Map(matchedProducts.map((p) => [p.id, p]))
      for (const p of ownProducts) productById.set(p.id, { ...(productById.get(p.id) || {}), id: p.id, source: SOURCE })
      const storeOffers = store ? await sbAll(`product_offers?store_id=eq.${store.id}&select=id,product_id,size,price,in_stock`) : []
      console.log(`Parjusto: ${gtinRows.length} códigos de barras já conhecidos, ${ownProducts.length} ténis da Direct-Volley, ${storeOffers.length} ofertas da loja`)

      // 4) Decidir o que fazer com cada modelo+cor
      const toCreate = []
      const offerUpserts = []
      const gtinUpserts = []
      const seenOfferKeys = new Set()
      for (const g of groups.values()) {
        report.groups++
        const priced = g.rows.filter((r) => r.size && r.price && r.url)
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
          if (prod?.source === SOURCE) report.matchedOwn++
          else { report.matchedExisting++; inc(report.matchedBySource, prod?.source || 'manual') }
          if (MODE === 'test') continue
          for (const r of gRows) {
            const key = `${productId}|${r.size}`
            if (seenOfferKeys.has(key)) continue
            seenOfferKeys.add(key)
            offerUpserts.push({ product_id: productId, store_id: store.id, size: r.size, price: r.price, currency: 'EUR', affiliate_url: r.url, in_stock: r.inStock, last_checked_at: now })
            if (r.ean && !productByEan.has(r.ean)) { gtinUpserts.push({ ean: r.ean, product_id: productId, size: r.size }); productByEan.set(r.ean, productId) }
          }
          continue
        }
        toCreate.push({ g, rows: gRows, category: mapCategory(g.first.merchant_category), gender: mapGender(g.first.custom_2, g.first.custom_3, gRows.map((r) => r.size)) })
      }

      // Modo teste: LIMIT ténis variados, alternando categoria e género.
      let createList = toCreate
      if (MODE === 'test') {
        const buckets = new Map()
        for (const c of toCreate) {
          const k = `${c.category}|${c.gender}`
          if (!buckets.has(k)) buckets.set(k, [])
          buckets.get(k).push(c)
        }
        const lists = [...buckets.values()].sort((a, b) => b.length - a.length)
        createList = []
        for (let i = 0; createList.length < LIMIT && lists.some((l) => i < l.length); i++) {
          for (const l of lists) if (i < l.length && createList.length < LIMIT) createList.push(l[i])
        }
      }

      // 5) Marcas novas
      const newBrandRows = []
      const brandOf = (name) => slugify(String(name).replace(/\s+classics$/i, ''))
      for (const c of createList) {
        const bname = String(c.g.first.brand_name || '').trim()
        const slug = brandOf(bname)
        if (slug && !brandBySlug.has(slug) && !newBrandRows.some((b) => b.slug === slug)) newBrandRows.push({ slug, name: titleCaseIfShouting(bname.replace(/\s+classics$/i, '')) })
      }
      if (newBrandRows.length) {
        await sbInsertChunks('brands', newBrandRows, { onConflict: 'slug', ignore: true })
        for (const b of await sbAll('brands?select=id,slug,name')) brandBySlug.set(b.slug, b)
        report.newBrands = newBrandRows.map((b) => b.name)
      }

      // 6) Criar os ténis novos (endereços sem repetir os que já existem)
      const candidates = createList.map((c) => {
        const p = c.g.first
        const brand = brandBySlug.get(brandOf(p.brand_name))
        const model = modelName(p.product_name, p.brand_name)
        const color = translateColor(p.colour)
        const base = slugify(`${brand?.name ?? p.brand_name} ${model} ${color || ''} ${c.gender === 'crianca' ? 'crianca' : ''}`).slice(0, 80).replace(/-+$/, '')
        return { c, p, brand, model, color, base }
      }).filter((x) => x.brand)
      const takenSlugs = new Set((await sbIn('products', 'slug', candidates.map((x) => x.base), 'slug', 100)).map((r) => r.slug))
      const newProducts = []
      const pending = []
      for (const x of candidates) {
        const { c, p, brand, model, color, base } = x
        let slug = base
        for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`
        takenSlugs.add(slug)
        const photo = (p.merchant_image_url || '').startsWith('https://') ? p.merchant_image_url : null
        if (!photo) { report.errors.push(`sem foto: ${c.g.id}`); continue }
        newProducts.push({
          brand_id: brand.id,
          model_name: model,
          slug,
          category: c.category,
          gender: c.gender,
          image_url: photo,
          image_urls: [],
          color,
          base_colors: baseColors(color),
          // sempre escondido ao criar: só fica visível depois de a foto estar tratada
          is_active: false,
          article_code: p.mpn || null,
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
          seenOfferKeys.add(`${prod.id}|${r.size}`)
        }
      }
      await sbInsertChunks('product_gtins', newGtins, { onConflict: 'ean', ignore: true })
      const insertedOffers = await sbInsertChunks('product_offers', newOffers, { onConflict: 'product_id,store_id,size', ignore: true, returning: true })
      report.createdOffers = insertedOffers.length
      await sbInsertChunks('price_history', insertedOffers.map((o) => ({ product_offer_id: o.id, price: o.price, recorded_at: now })))

      // 7) Preço e stock (só no modo full): ofertas em ténis que já existem
      // e nos ténis desta loja já importados antes
      if (MODE === 'full') {
        await sbInsertChunks('product_gtins', gtinUpserts, { onConflict: 'ean', ignore: true })
        const existingByKey = new Map(storeOffers.map((o) => [`${o.product_id}|${o.size}`, o]))
        const changedPrice = offerUpserts.filter((u) => {
          const old = existingByKey.get(`${u.product_id}|${u.size}`)
          return !old || Number(old.price) !== u.price
        })
        const written = await sbInsertChunks('product_offers', offerUpserts, { onConflict: 'product_id,store_id,size', returning: true })
        report.updatedOffers = written.length
        report.offersOnExisting = offerUpserts.filter((u) => productById.get(u.product_id)?.source !== SOURCE).length
        const idByKey = new Map(written.map((o) => [`${o.product_id}|${o.size}`, o.id]))
        const history = changedPrice.map((u) => ({ product_offer_id: idByKey.get(`${u.product_id}|${u.size}`), price: u.price, recorded_at: now })).filter((h) => h.product_offer_id)
        await sbInsertChunks('price_history', history)
        report.priceChanges = history.length

        // tamanhos que já não estão no ficheiro -> esgotados (o ficheiro só
        // traz o que há em stock)
        const gone = storeOffers.filter((o) => o.in_stock && !seenOfferKeys.has(`${o.product_id}|${o.size}`)).map((o) => o.id)
        for (let i = 0; i < gone.length; i += 200) {
          await sb(`product_offers?id=in.(${gone.slice(i, i + 200).join(',')})`, { method: 'PATCH', body: { in_stock: false, last_checked_at: now }, prefer: 'return=minimal' })
        }
        report.markedOutOfStock = gone.length
      }
    } // fim de "if (MODE !== 'photos')"

    // 8) Fotos: tratar a foto principal dos ténis da Direct-Volley que ainda
    // têm a foto original da loja.
    if (MODE !== 'test' || report.created > 0) {
      const todo = (await sbAll(`products?source=eq.${SOURCE}&image_url=not.like.*/product-photos/*&select=id,slug,image_url,image_urls&order=created_at.desc`)).slice(0, PHOTO_LIMIT)
      console.log(`Fotos por tratar: ${todo.length}`)
      let next = 0
      async function worker() {
        while (next < todo.length) {
          const p = todo[next++]
          try {
            const url = await processAndUpload({ supabaseUrl: SUPABASE_URL, key: SUPABASE_KEY, sourceUrl: p.image_url, path: `direct-volley/${p.slug}.webp` })
            const gallery = [p.image_url, ...(p.image_urls ?? [])].filter((u, i, all) => u && all.indexOf(u) === i).slice(0, 6)
            await sb(`products?id=eq.${p.id}`, { method: 'PATCH', body: { image_url: url, image_urls: gallery, updated_at: new Date().toISOString() }, prefer: 'return=minimal' })
            report.photosDone++
          } catch (e) {
            report.photosFailed++
            if (report.photoErrors.length < 20) report.photoErrors.push(`${p.slug}: ${String(e?.message || e).slice(0, 120)}`)
          }
        }
      }
      await Promise.all(Array.from({ length: 6 }, worker))
      console.log(`Fotos tratadas: ${report.photosDone}, falharam: ${report.photosFailed}`)
    }

    // 9) Visível / escondido: fica visível o ténis da Direct-Volley com foto
    // tratada e pelo menos um tamanho em stock (em qualquer loja); fica
    // escondido o que ficou sem stock nenhum.
    if (ACTIVATE_NEW && MODE !== 'test') {
      const imported = await sbAll(`products?source=eq.${SOURCE}&select=id,is_active,image_url,product_offers(in_stock,discontinued_at)&order=id`)
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
          await sb(`products?id=in.(${ids.slice(i, i + 200).join(',')})`, { method: 'PATCH', body: { is_active: value, updated_at: new Date().toISOString() }, prefer: 'return=minimal' })
        }
      }
      report.activated = toOn.length
      report.deactivated = toOff.length
      console.log(`Visíveis agora: +${toOn.length}, escondidos: ${toOff.length}`)
    }
  } catch (e) {
    report.errors.push(String(e?.stack || e).replace(AWIN_KEY || '###', '***').slice(0, 2000))
    console.error(String(e?.stack || e).replace(AWIN_KEY || '###', '***'))
  }

  report.seconds = Math.round((Date.now() - t0) / 1000)
  console.log(JSON.stringify({ ...report, created_slugs: undefined }, null, 1))
  try {
    await sb('import_runs', { method: 'POST', body: { source: SOURCE, mode: MODE, started_at: new Date(t0).toISOString(), finished_at: new Date().toISOString(), report }, prefer: 'return=minimal' })
  } catch (e) { console.error('Não consegui guardar o resumo:', e) }
  if (report.errors.length) process.exitCode = 1
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
