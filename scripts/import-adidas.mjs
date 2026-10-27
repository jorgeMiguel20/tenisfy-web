// scripts/import-adidas.mjs
//
// Importa o calçado da adidas PT a partir do ficheiro de produtos da Awin
// (feed 92150, "Adidas PT - Variant", ~70.000 linhas - uma por tamanho, com
// roupa e acessórios misturados). Corre no GitHub Actions
// (.github/workflows/import-adidas.yml), com a chave da Awin guardada nos
// "secrets" do repositório (AWIN_API_KEY).
//
// Funciona como o importador da 4 Elementos (scripts/import-4elementos.mjs):
//   1. Só fica com CALÇADO (categorias que começam por "Calcado"; o Jorge
//      escolheu todo o calçado em 2026-10-22: ténis, chuteiras, botas,
//      sandálias, chinelos...). Roupa e acessórios ficam de fora.
//   2. Junta as linhas de cada artigo (um modelo numa cor: o código antes do
//      "-" em merchant_product_id, ex. "JQ2210-0001" -> "JQ2210") e procura
//      se o ténis já existe no Parjusto: já importado da adidas (mesmo
//      artigo) ou pelo código de barras (EAN) de algum tamanho - assim um
//      ténis que já veio da About You recebe também a oferta da adidas.
//      Ténis criados à mão (os escolhidos pelo Jorge) não são tocados.
//   3. Ténis novos: cria o ténis (marca, modelo, cor em português, género,
//      categoria, fotos da loja) e uma oferta por tamanho.
//   4. Tamanhos que deixaram de aparecer no ficheiro ficam "esgotados".
//   5. Trata a foto principal (fundo igual ao do Parjusto, ténis inteiro -
//      ver feed-photos.mjs). Um ténis só fica visível no site depois disso.
//
// Os endereços de compra guardados são sempre os da própria adidas
// (merchant_deep_link). Os links de afiliado ligam-se de uma só vez, no
// "template" da loja (stores.affiliate_url_template; o site junta-o ao link
// na hora de mostrar o botão "Ver oferta", ver lib/offerUrl.ts): assim
// vale também para os ténis criados à mão e desliga-se com uma só alteração.
// Variável AFFILIATE_LINKS: "on" liga, "off" desliga, vazia não mexe.
//
// Modos (variável MODE): test (até LIMIT ténis novos ESCONDIDOS, variados),
// full (tudo; com ACTIVATE_NEW=true ficam visíveis os que têm foto tratada e
// stock), photos (só as fotos) e review (não altera nada: lista os ténis
// escondidos da adidas e guarda uma folha com as fotos para o Jorge ver, em
// product-photos/_review/). Resumo de cada execução: tabela import_runs.
import { processAndUpload } from './feed-photos.mjs'
import { streamCsvRows } from './awin-csv.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const AWIN_KEY = process.env.AWIN_API_KEY
const FEED_ID = process.env.AWIN_FEED_ID || '92150'
const MODE = process.env.MODE || 'test'
const LIMIT = Number(process.env.LIMIT || 50)
const ACTIVATE_NEW = process.env.ACTIVATE_NEW === 'true'
const PHOTO_LIMIT = Number(process.env.PHOTO_LIMIT || 4000)
const SOURCE = 'adidas'
const PHOTO_HOST = 'https://assets.adidas.com'
// Link de afiliado da Awin (programa da adidas PT, conta Parjusto.pt); {url}
// é o endereço da adidas, que o site codifica.
const AFFILIATE_TEMPLATE = 'https://www.awin1.com/cread.php?awinmid=77026&awinaffid=3107069&ued={url}'

for (const [v, n] of [[SUPABASE_URL, 'SUPABASE_URL'], [SUPABASE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'], [MODE === 'photos' || MODE === 'review' ? 'x' : AWIN_KEY, 'AWIN_API_KEY']]) {
  if (!v) { console.error(`Falta a variável ${n}`); process.exit(1) }
}
if (!['test', 'full', 'photos', 'review'].includes(MODE)) { console.error(`Modo desconhecido: ${MODE}`); process.exit(1) }

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

const isFootwear = (c) => /^Calcado/i.test((c || '').trim())

// Código do artigo (modelo + cor): "JQ2210-0001" -> "JQ2210". Cada tamanho
// tem o seu sufixo.
function articleOf(merchantProductId) {
  return String(merchantProductId || '').split('-')[0].trim()
}

// Detalhes do ténis a partir do campo "specifications" do ficheiro da adidas
// (ex.: "Ajuste normal|Com atacadores|Topo em pele sintética|Forro em
// têxtil|Sola de borracha"): ajuste, fecho, sola e o resto (materiais e
// construção) vão para as mesmas colunas que os ténis escolhidos à mão usam
// (fit, closure_type, sole_type, material) e aparecem em "Detalhes do
// produto". Sem texto, tudo vazio (nada é inventado).
function parseSpecs(text) {
  const items = String(text || '').split('|').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const lower = (s) => (/^\p{Lu}\p{Ll}/u.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)
  const join = (list) => (list.length ? list.map((s, i) => (i === 0 ? s : lower(s))).join(', ') : null)
  const fit = []
  const closure = []
  const sole = []
  const material = []
  for (const it of items) {
    if (/^ajuste\b/i.test(it)) fit.push(it)
    else if (/^(sola|entressola)\b/i.test(it)) sole.push(it)
    else if (/atacadores|velcro|el[aá]stic|fecho|cord[aã]o|tira\b|fivela/i.test(it) && !/^(topo|forro|palmilha)/i.test(it)) closure.push(it)
    else material.push(it)
  }
  return { fit: join(fit.slice(0, 1)), closure_type: join(closure), sole_type: join(sole), material: join(material) }
}

// Palavras genéricas no início do nome ("Sapatilhas de Caminhada AX5 ...",
// "SAPATILHAS SAMBA JP", "Chuteiras Predator ..."): saem, porque o tipo de
// calçado já aparece na categoria e o nome do modelo é o que identifica o
// ténis (como "Samba OG" no Parjusto).
const GENERIC_PREFIX = /^(sapatilhas|sapatilha|sapatos|ténis|tenis|chuteiras?|botas?|botins|sandálias?|chinelos?|chinelas?|mocassins?|sabrinas?|mules?|pantufas?|galochas?|calçado)\b(\s+de\s+\p{L}+(\s+e\s+\p{L}+)?)?\s+/iu

function fixCaps(m) {
  if (!/[A-ZÀ-Ý]{4,}/.test(m)) return m
  return m.split(' ').map((w) => (/^[A-ZÀ-Ý]{4,}$/.test(w) ? w.charAt(0) + w.slice(1).toLowerCase() : w)).join(' ')
}

function modelName(productName) {
  let n = String(productName || '').replace(/\s+/g, ' ').trim()
  n = n.replace(/^adidas\s+/i, '')
  const stripped = n.replace(GENERIC_PREFIX, '').trim()
  if (stripped.length >= 2) n = stripped
  return fixCaps(n) || 'Sapatilhas'
}

// Cores da adidas vêm em inglês ("Core Black / Cloud White / Gum"). Cada
// parte passa a uma cor simples em português; partes que não se reconhecem
// ficam como estão. Partes repetidas juntam-se ("Core Black / Core Black" ->
// "Preto").
const COLOR_PARTS = [
  [/black|carbon\b|onix|onyx/i, 'Preto'],
  [/white|ivory|chalk|cloud|alumina/i, 'Branco'],
  [/grey|gray|charcoal|silver|stone|metallic/i, 'Cinzento'],
  [/navy|collegiate navy/i, 'Azul marinho'],
  [/blue|indigo|royal|cobalt|sky|aqua|ink/i, 'Azul'],
  [/red|maroon|burgundy|scarlet|crimson|wine|power/i, 'Vermelho'],
  [/green|olive|mint|lime|khaki|sage|emerald/i, 'Verde'],
  [/yellow|gold|lemon|mustard|solar\s*turbo/i, 'Amarelo'],
  [/orange|coral|rust/i, 'Laranja'],
  [/pink|magenta|fuchsia|rose/i, 'Rosa'],
  [/purple|violet|lilac|lavender|plum/i, 'Roxo'],
  [/brown|coffee|earth|bronze|tan|mocha|cognac|camel|chocolate|gum|wonder\s*taupe/i, 'Castanho'],
  [/beige|sand|cream|bliss|wonder|ecru|putty|off\s*white/i, 'Bege'],
  [/multi/i, 'Multicolor'],
]

function translateColor(raw) {
  const parts = String(raw || '').split('/').map((p) => p.trim()).filter(Boolean)
  const out = []
  for (const part of parts) {
    let name = null
    if (/off\s*white/i.test(part)) name = 'Branco'
    else for (const [re, pt] of COLOR_PARTS) if (re.test(part)) { name = pt; break }
    name = name || part
    if (!out.includes(name)) out.push(name)
  }
  return out.join(' / ') || null
}

const BASE_COLORS = [
  [/preto/i, 'Preto'], [/branco/i, 'Branco'], [/cinzento/i, 'Cinzento'], [/azul/i, 'Azul'], [/vermelho/i, 'Vermelho'],
  [/verde/i, 'Verde'], [/amarelo/i, 'Amarelo'], [/laranja/i, 'Laranja'], [/rosa/i, 'Rosa'], [/roxo/i, 'Roxo'],
  [/castanho/i, 'Castanho'], [/bege/i, 'Bege'], [/multicolor/i, 'Multicolor'],
]

function baseColors(color) {
  if (!color) return []
  const out = []
  for (const part of color.split('/')) {
    for (const [re, name] of BASE_COLORS) {
      if (re.test(part) && !out.includes(name)) { out.push(name); break }
    }
  }
  return out.slice(0, 2)
}

// "42,5" -> "42.5"; "45 1/3" fica igual (é o nome que o Parjusto já usa).
function normSize(s) {
  return String(s || '').trim().replace(/,/g, '.').replace(/\s+/g, ' ')
}

function ean13(e) {
  const s = String(e || '').replace(/\D/g, '')
  if (s.length < 8 || s.length > 14) return null
  return s.length < 13 ? s.padStart(13, '0') : s
}

function mapGender(suitableFor, sizes) {
  const g = String(suitableFor || '').trim().toLowerCase()
  const nums = sizes.map((s) => parseFloat(s)).filter((n) => Number.isFinite(n))
  if (g === 'criança' || g === 'crianca' || (nums.length && Math.max(...nums) < 35)) return 'crianca'
  if (g === 'homem') return 'homem'
  if (g === 'mulher') return 'mulher'
  return 'unissexo'
}

// Categoria do Parjusto (filtro do catálogo), a partir da categoria da loja
// e do desporto que a adidas indica (custom_2: "Lifestyle", "Futebol",
// "Running", "Ginásio e Treino", "Montanhismo", ...).
function mapCategory(merchantCategory, sport, name) {
  const c = String(merchantCategory || '')
  const s = String(sport || '')
  if (/Botas de Futebol/i.test(c) || /^Futebol/i.test(s)) return 'futebol'
  if (/Sandálias|chinelos/i.test(c)) return 'sandalias'
  if (/trail/i.test(s) || /terrex.*trail|trail/i.test(name)) return 'trail'
  if (/Montanhismo|caminhada/i.test(s) || /\bBotas\b/i.test(c)) return 'caminhada'
  if (/Running/i.test(s) || /Running/i.test(c)) return 'running'
  if (/Gin[aá]sio|Treino/i.test(s) || /Gin[aá]sio/i.test(c)) return 'treino'
  if (/Basquetebol|T[eé]nis|Golfe|Rugby|Nata[cç][aã]o|Skate|motorizados|Padel/i.test(s)) return 'desporto'
  return 'lifestyle'
}

// ---------------------------------------------------------- Ficheiro CSV
const COLUMNS = [
  'merchant_product_id', 'product_name', 'brand_name', 'merchant_category', 'colour', 'Fashion:suitable_for',
  'Fashion:size', 'search_price', 'in_stock', 'stock_quantity', 'merchant_deep_link', 'merchant_image_url',
  'alternate_image', 'alternate_image_two', 'alternate_image_three', 'ean', 'custom_2', 'specifications',
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
// Modo "review": não altera nada. Escreve no registo a lista dos ténis da
// adidas que ainda estão escondidos e guarda uma folha com as fotos
// (5 por linha, com nome, cor, género, categoria e preço) em
// product-photos/_review/, para ver no browser.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function reviewSheet() {
  const { default: sharp } = await import('sharp')
  const rows = await sb(`products?source=eq.${SOURCE}&is_active=eq.false&select=id,slug,model_name,color,category,gender,image_url,product_offers(price,size,in_stock)&order=created_at.desc&limit=60`)
  const items = rows.map((p) => {
    const prices = (p.product_offers ?? []).map((o) => Number(o.price))
    return { ...p, from: prices.length ? Math.min(...prices) : null, sizes: (p.product_offers ?? []).length }
  })
  console.log(`Ténis escondidos da adidas: ${items.length}`)
  for (const p of items) console.log(`REVISAO | ${p.slug} | ${p.model_name} | ${p.color} | ${p.gender} | ${p.category} | desde ${p.from} € | ${p.sizes} tamanhos`)
  const COLS = 5, W = 260, IMG = 200, H = 290
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
      [`${p.model_name}`.slice(0, 30), 15, 700],
      [`${p.color || ''} · ${p.gender}`.slice(0, 34), 12, 400],
      [`${p.category} · desde ${p.from} € · ${p.sizes} tam.`.slice(0, 38), 12, 400],
    ]
    const text = lines.map(([t, size, weight], k) => `<text x="10" y="${28 + k * 20}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#17232B">${esc(t)}</text>`).join('')
    layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H - IMG - 8}">${text}</svg>`), left: x, top: y + IMG + 8 })
  }
  const sheet = await sharp({ create: { width: COLS * W, height: Math.max(1, rowsN) * H, channels: 3, background: '#FFFFFF' } }).composite(layers).webp({ quality: 82 }).toBuffer()
  const path = `_review/adidas-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.webp`
  const { uploadPhoto } = await import('./feed-photos.mjs')
  console.log(`FOLHA ${await uploadPhoto({ supabaseUrl: SUPABASE_URL, key: SUPABASE_KEY, path, buffer: sheet })}`)
}

if (MODE === 'review') {
  try { await reviewSheet() } catch (e) { console.error(String(e?.stack || e)); process.exitCode = 1 }
  process.exit(process.exitCode || 0)
}

// ------------------------------------------------------------------ Main
const t0 = Date.now()
const now = new Date().toISOString()
const report = { mode: MODE, limit: LIMIT, activateNew: ACTIVATE_NEW, rows: 0, footwearRows: 0, groups: 0, created: 0, createdOffers: 0, updatedOffers: 0, priceChanges: 0, markedOutOfStock: 0, matchedManual: 0, matchedImported: 0, skippedNoPrice: 0, photosDone: 0, photosFailed: 0, activated: 0, deactivated: 0, detailsFilled: 0, photoErrors: [], newBrands: [], categories: {}, genders: {}, brands: {}, created_slugs: [], errors: [] }
const inc = (o, k) => { o[k] = (o[k] || 0) + 1 }

try {
  // 1) O que já existe no Parjusto. A loja é a "adidas" que já existe (a dos
  // ténis criados à mão); se não houver nenhuma, cria-se.
  let store = (await sb(`stores?slug=eq.adidas&select=id,slug,name`))[0]
  if (!store) store = (await sb(`stores?name=ilike.adidas*&select=id,slug,name&order=id&limit=1`))[0]
  if (!store) {
    store = (await sb('stores', { method: 'POST', body: { slug: 'adidas', name: 'adidas', base_url: 'https://www.adidas.pt' }, prefer: 'return=representation' }))[0]
    console.log('Loja adidas criada')
  }
  console.log(`Loja: ${store.name} (${store.slug})`)
  if (process.env.AFFILIATE_LINKS === 'on' || process.env.AFFILIATE_LINKS === 'off') {
    const template = process.env.AFFILIATE_LINKS === 'on' ? AFFILIATE_TEMPLATE : null
    await sb(`stores?id=eq.${store.id}`, { method: 'PATCH', body: { affiliate_url_template: template }, prefer: 'return=minimal' })
    console.log(`Links de afiliado da adidas: ${template ? 'LIGADOS' : 'desligados'}`)
  }
  const brands = await sbAll('brands?select=id,slug,name')
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]))
  const products = await sbAll('products?select=id,slug,source,source_ref,image_url,is_active,material,sole_type,closure_type,fit,article_code&order=id')
  const slugs = new Set(products.map((p) => p.slug))
  const productById = new Map(products.map((p) => [p.id, p]))
  const importedByRef = new Map(products.filter((p) => p.source === SOURCE).map((p) => [p.source_ref, p]))
  const gtinRows = await sbAll('product_gtins?select=ean,product_id,size')
  const productByEan = new Map(gtinRows.map((g) => [g.ean, g.product_id]))
  // Ofertas da adidas só dos ténis importados (os criados à mão têm ofertas
  // próprias nesta mesma loja e não se mexe nelas).
  const storeOffers = (await sbAll(`product_offers?store_id=eq.${store.id}&select=id,product_id,size,price,in_stock,discontinued_at`)).filter((o) => productById.get(o.product_id)?.source)
  console.log(`Parjusto: ${products.length} ténis, ${brands.length} marcas, ${gtinRows.length} EAN, ${storeOffers.length} ofertas adidas de ténis importados`)

  if (MODE !== 'photos') {
    // 2) Ler o ficheiro (aos bocados) e juntar as linhas por artigo
    const groups = new Map()
    for await (const p of streamCsvRows(await openFeed())) {
      report.rows++
      if (!isFootwear(p.merchant_category)) continue
      report.footwearRows++
      const gid = articleOf(p.merchant_product_id)
      if (!gid) continue
      let g = groups.get(gid)
      if (!g) { g = { id: gid, first: p, rows: [] }; groups.set(gid, g) }
      const price = Number(p.search_price)
      g.rows.push({
        size: normSize(p['Fashion:size']),
        ean: ean13(p.ean),
        price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
        url: (p.merchant_deep_link || '').startsWith('https://') ? p.merchant_deep_link : null,
        inStock: p.in_stock !== '0' && p.stock_quantity !== '0',
      })
    }
    console.log(`Ficheiro: ${report.rows} linhas, ${report.footwearRows} de calçado, ${groups.size} artigos`)

    // 3) Decidir o que fazer com cada artigo
    const toCreate = []
    const offerUpserts = []
    const detailPatches = []
    const seenOfferKeys = new Set()
    for (const g of groups.values()) {
      report.groups++
      const gRows = g.rows.filter((r) => r.size && r.price && r.url)
      if (gRows.length === 0) { report.skippedNoPrice++; continue }

      let productId = importedByRef.get(g.id)?.id
      if (!productId) {
        for (const r of gRows) if (r.ean && productByEan.has(r.ean)) { productId = productByEan.get(r.ean); break }
      }
      if (productId) {
        const prod = productById.get(productId)
        if (!prod || !prod.source) { report.matchedManual++; continue } // ténis criado à mão: não mexer
        report.matchedImported++
        if (MODE === 'test') continue
        // Detalhes que ainda faltam neste ténis (só preenche o que está vazio)
        const spec = parseSpecs(g.first.specifications)
        const patch = {}
        for (const [k, v] of [['material', spec.material], ['sole_type', spec.sole_type], ['closure_type', spec.closure_type], ['fit', spec.fit], ['article_code', g.id]]) if (v && !prod[k]) patch[k] = v
        if (Object.keys(patch).length) detailPatches.push({ id: productId, patch })
        for (const r of gRows) {
          const key = `${productId}|${r.size}`
          if (seenOfferKeys.has(key)) continue
          seenOfferKeys.add(key)
          offerUpserts.push({ product_id: productId, store_id: store.id, size: r.size, price: r.price, currency: 'EUR', affiliate_url: r.url, in_stock: r.inStock, last_checked_at: now })
        }
        continue
      }
      toCreate.push({ g, rows: gRows, category: mapCategory(g.first.merchant_category, g.first.custom_2, g.first.product_name), gender: mapGender(g.first['Fashion:suitable_for'], gRows.map((r) => r.size)) })
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

    // 4) Marcas novas (a adidas já existe; fica aqui por segurança)
    const adidasBrand = brandBySlug.get('adidas')
    if (!adidasBrand) {
      await sbInsertChunks('brands', [{ slug: 'adidas', name: 'adidas' }], { onConflict: 'slug', ignore: true })
      for (const b of await sbAll('brands?select=id,slug,name')) brandBySlug.set(b.slug, b)
      report.newBrands = ['adidas']
    }
    const brand = brandBySlug.get('adidas')

    // 5) Criar os ténis novos
    const newProducts = []
    const pending = []
    for (const c of createList) {
      const p = c.g.first
      const model = modelName(p.product_name)
      const color = translateColor(p.colour)
      const spec = parseSpecs(p.specifications)
      const base = slugify(`adidas ${model} ${color || ''} ${c.gender === 'crianca' ? 'crianca' : ''}`).slice(0, 80).replace(/-+$/, '')
      let slug = base
      for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`
      slugs.add(slug)
      const photos = [p.merchant_image_url, p.alternate_image, p.alternate_image_two, p.alternate_image_three].filter((u, i, all) => u && u.startsWith('https://') && all.indexOf(u) === i)
      if (!photos.length) { report.errors.push(`sem foto: ${c.g.id}`); slugs.delete(slug); continue }
      newProducts.push({
        brand_id: brand.id,
        model_name: model,
        slug,
        category: c.category,
        gender: c.gender,
        image_url: photos[0],
        image_urls: photos.slice(1),
        color,
        base_colors: baseColors(color),
        // sempre escondido ao criar: só fica visível depois de a foto estar
        // tratada (passo 7)
        is_active: false,
        material: spec.material,
        sole_type: spec.sole_type,
        closure_type: spec.closure_type,
        fit: spec.fit,
        article_code: c.g.id,
        source: SOURCE,
        source_ref: c.g.id,
        created_at: now,
        updated_at: now,
      })
      pending.push(c)
      inc(report.categories, c.category)
      inc(report.genders, c.gender)
      inc(report.brands, 'adidas')
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
      }
    }
    await sbInsertChunks('product_gtins', newGtins, { onConflict: 'ean', ignore: true })
    const insertedOffers = await sbInsertChunks('product_offers', newOffers, { onConflict: 'product_id,store_id,size', ignore: true, returning: true })
    report.createdOffers = insertedOffers.length
    await sbInsertChunks('price_history', insertedOffers.map((o) => ({ product_offer_id: o.id, price: o.price, recorded_at: now })))

    // 6) Atualizar preço e stock dos ténis já importados (só no modo full)
    if (MODE === 'full') {
      // Detalhes (material, sola, fecho, ajuste, código do artigo) dos ténis já importados a que ainda faltam
      for (let i = 0; i < detailPatches.length; i += 8) {
        await Promise.all(detailPatches.slice(i, i + 8).map((d) => sb('products?id=eq.' + d.id, { method: 'PATCH', body: d.patch, prefer: 'return=minimal' })))
      }
      report.detailsFilled = detailPatches.length
      const existingByKey = new Map(storeOffers.map((o) => [`${o.product_id}|${o.size}`, o]))
      const changedPrice = offerUpserts.filter((u) => {
        const old = existingByKey.get(`${u.product_id}|${u.size}`)
        return !old || Number(old.price) !== u.price
      })
      const written = await sbInsertChunks('product_offers', offerUpserts, { onConflict: 'product_id,store_id,size', returning: true })
      report.updatedOffers = written.length
      const idByKey = new Map(written.map((o) => [`${o.product_id}|${o.size}`, o.id]))
      const history = changedPrice.map((u) => ({ product_offer_id: idByKey.get(`${u.product_id}|${u.size}`), price: u.price, recorded_at: now })).filter((h) => h.product_offer_id)
      await sbInsertChunks('price_history', history)
      report.priceChanges = history.length

      // tamanhos que já não estão no ficheiro -> esgotados (só em ténis
      // importados; os ténis criados hoje acabaram de ser escritos)
      const gone = storeOffers.filter((o) => o.in_stock && !seenOfferKeys.has(`${o.product_id}|${o.size}`)).map((o) => o.id)
      for (let i = 0; i < gone.length; i += 200) {
        await sb(`product_offers?id=in.(${gone.slice(i, i + 200).join(',')})`, { method: 'PATCH', body: { in_stock: false, last_checked_at: now }, prefer: 'return=minimal' })
      }
      report.markedOutOfStock = gone.length
    }
  } // fim de "if (MODE !== 'photos')"

  // 7) Fotos: tratar a foto principal dos ténis da adidas que ainda têm a
  // foto original da loja.
  if (MODE !== 'test' || report.created > 0) {
    const todo = (await sbAll(`products?source=eq.${SOURCE}&image_url=like.${PHOTO_HOST}*&select=id,slug,image_url,image_urls&order=created_at.desc`)).slice(0, PHOTO_LIMIT)
    console.log(`Fotos por tratar: ${todo.length}`)
    let next = 0
    async function worker() {
      while (next < todo.length) {
        const p = todo[next++]
        const candidates = [p.image_url, ...(p.image_urls ?? [])].filter((u) => u && u.startsWith(PHOTO_HOST))
        let done = false
        for (const sourceUrl of candidates.slice(0, 2)) {
          try {
            const url = await processAndUpload({ supabaseUrl: SUPABASE_URL, key: SUPABASE_KEY, sourceUrl, path: `adidas/${p.slug}.webp` })
            const gallery = [p.image_url, ...(p.image_urls ?? [])].filter((u, i, all) => u && all.indexOf(u) === i).slice(0, 6)
            await sb(`products?id=eq.${p.id}`, { method: 'PATCH', body: { image_url: url, image_urls: gallery, updated_at: new Date().toISOString() }, prefer: 'return=minimal' })
            report.photosDone++
            done = true
            break
          } catch (e) {
            if (report.photoErrors.length < 20) report.photoErrors.push(`${p.slug}: ${String(e?.message || e).slice(0, 120)}`)
          }
        }
        if (!done) report.photosFailed++
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker))
    console.log(`Fotos tratadas: ${report.photosDone}, falharam: ${report.photosFailed}`)
  }

  // 8) Visível / escondido: fica visível o ténis da adidas com foto tratada
  // e pelo menos um tamanho em stock (em qualquer loja); fica escondido o
  // que ficou sem stock nenhum.
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
