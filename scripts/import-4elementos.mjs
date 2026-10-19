// scripts/import-4elementos.mjs
//
// Importa os ténis da 4 Elementos PT a partir do ficheiro de produtos da
// Awin (feed 114316, "Predeterminado", ~3.800 linhas - uma por tamanho).
// Corre no GitHub Actions (.github/workflows/import-4elementos.yml), com a
// chave da Awin guardada nos "secrets" do repositório (AWIN_API_KEY).
//
// Funciona como o importador da About You (scripts/import-aboutyou.mjs):
//   1. Só fica com ténis/sapatilhas (categorias "Ténis", "Sapatilhas",
//      "Zapatillas" e "Sapatos" da loja). Botas, sandálias, tamancos,
//      chinelos, roupa e acessórios ficam de fora.
//   2. Junta as linhas de cada artigo (um modelo numa cor) e procura se o
//      ténis já existe no Parjusto:
//      - já importado antes da 4 Elementos (mesmo número de artigo);
//      - ou pelo código de barras (EAN) de algum tamanho - assim um ténis
//        que já veio da About You recebe também a oferta da 4 Elementos e
//        fica com as duas lojas para comparar.
//      Ténis criados à mão (os escolhidos pelo Jorge) não são tocados.
//   3. Ténis novos: cria o ténis (marca, modelo sem o código de artigo, cor,
//      género, categoria, fotos da loja) e uma oferta por tamanho.
//   4. Tamanhos que deixaram de aparecer no ficheiro ficam "esgotados".
//   5. Trata a foto principal (fundo igual ao do Parjusto, ténis inteiro -
//      ver feed-photos.mjs). Um ténis só fica visível no site depois disso.
//
// Modos (variável MODE): test (até LIMIT ténis novos ESCONDIDOS), full
// (tudo; com ACTIVATE_NEW=true ficam visíveis os que têm foto tratada e
// stock) e photos (só as fotos). Resumo de cada execução: tabela import_runs.
import { processAndUpload } from './feed-photos.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const AWIN_KEY = process.env.AWIN_API_KEY
const FEED_ID = process.env.AWIN_FEED_ID || '114316'
const MODE = process.env.MODE || 'test'
const LIMIT = Number(process.env.LIMIT || 50)
const ACTIVATE_NEW = process.env.ACTIVATE_NEW === 'true'
const PHOTO_LIMIT = Number(process.env.PHOTO_LIMIT || 3000)
const SOURCE = '4elementos'
const STORE_SLUG = '4-elementos'

for (const [v, n] of [[SUPABASE_URL, 'SUPABASE_URL'], [SUPABASE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'], [MODE === 'photos' ? 'x' : AWIN_KEY, 'AWIN_API_KEY']]) {
  if (!v) { console.error(`Falta a variável ${n}`); process.exit(1) }
}
if (!['test', 'full', 'photos'].includes(MODE)) { console.error(`Modo desconhecido: ${MODE}`); process.exit(1) }

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
// Categorias da loja que são ténis ("Zapatillas" é a mesma coisa, escrita
// em espanhol em alguns artigos; em "Sapatos" estão modelos como o Nike Air
// Rift e o Birkenstock Utti, que também são sapatilhas).
const SNEAKER_CATEGORY = /^(Ténis|Sapatilhas|Zapatillas|Sapatos)$/i

// Marcas: as mesmas regras do importador da About You (ver BRAND_ALIASES em
// scripts/import-aboutyou.mjs) - se mudar uma, mudar a outra.
const BRAND_ALIASES = [
  [/^adidas( originals| performance| sportswear| terrex| golf| by stella mccartney)?$/i, 'adidas', 'adidas'],
  [/^nike( sportswear| performance| acg)?$/i, 'nike', 'Nike'],
  [/^jordan$/i, 'jordan', 'Jordan'],
  [/^new balance$/i, 'new-balance', 'New Balance'],
  [/^asics( sportstyle)?$/i, 'asics', 'ASICS'],
  [/^puma$/i, 'puma', 'PUMA'],
  [/^vans$/i, 'vans', 'Vans'],
  [/^converse$/i, 'converse', 'Converse'],
  [/^hoka( one one)?$/i, 'hoka', 'HOKA'],
  [/^saucony$/i, 'saucony', 'Saucony'],
  [/^salomon( sportstyle)?$/i, 'salomon', 'Salomon'],
  [/^altra$/i, 'altra', 'Altra'],
  [/^reebok$/i, 'reebok', 'Reebok'],
  [/^on( running)?$/i, 'on', 'On'],
  [/^u\.?\s?s\.? polo assn\.?$/i, 'us-polo-assn', 'US Polo Assn.'],
  [/^genesis( footwear)?$/i, 'genesis', 'Genesis'],
  [/^(patrick )?ewing( athletics)?$/i, 'ewing', 'Ewing'],
]

export function slugify(s) {
  return String(s)
    .replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/ø/g, 'o').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function mapBrand(raw) {
  const name = (raw || '').trim().replace(/\s+/g, ' ')
  for (const [re, slug, display] of BRAND_ALIASES) if (re.test(name)) return { slug, name: display }
  return { slug: slugify(name), name }
}

// Código de artigo da loja no nome ("DR6694-400", "IF4336", "1203A394-600",
// "BB650RBR", "380686-10"): sai do nome do modelo. Nomes de modelo com
// números ficam ("Gel-1130", "P-6000", "990v6", "Campus 00s", "RC42").
function isArticleCode(t) {
  if (/[a-z]/.test(t)) return false
  if (/^GEL-/i.test(t) || /^[A-Z]-\d+$/.test(t)) return false
  const digits = (t.match(/\d/g) || []).length
  if (/^[A-Z]{1,3}\d{4}(-\d{2,3})?$/.test(t)) return true // DR6694-400, IF4336
  if (/^\d{5,}(-\d+)?$/.test(t)) return true // 380686-10
  if (/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(t) && t.length >= 6 && digits >= 2 && /[A-Z]/.test(t)) return true // 1203A394-600, BB650RBR, A05348C
  return false
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function modelName(productName, brandRaw, brandDisplay) {
  // "Nike Air Max 95 Big Bubble IR1944-400 - 42.5" -> "Air Max 95 Big Bubble"
  let n = String(productName || '').replace(/\s+-\s+[^-]+$/, '').trim()
  n = n.replace(/^Novo Balance\s+/i, 'New Balance ') // tradução automática da loja
  // tira a marca do início do nome, uma só vez ("Jordan Jordan 4 Retro" ->
  // "Jordan 4 Retro")
  for (const b of ['Hoka One One', brandRaw, brandDisplay]) {
    const re = b && new RegExp(`^${esc(b)}\\s+`, 'i')
    if (re && re.test(n)) { n = n.replace(re, ''); break }
  }
  n = n.split(/\s+/).filter((t) => !isArticleCode(t)).join(' ').trim()
  return fixCaps(n) || 'Sapatilhas'
}

// "AZTREK" -> "Aztrek" (como no importador da About You). Siglas curtas e
// com números ("LV8", "GEL-1130", "ACG") ficam.
function fixCaps(m) {
  if (!/[A-ZÀ-Ý]{4,}/.test(m)) return m
  return m.split(' ').map((w) => (/^[A-ZÀ-Ý]{4,}$/.test(w) ? w.charAt(0) + w.slice(1).toLowerCase() : w)).join(' ')
}

const BASE_COLORS = [
  [/preto|negro|antracite/, 'Preto'],
  [/branco|offwhite|off-white|marfim/, 'Branco'],
  [/cinzento|prata|cinza|platina|grafite/, 'Cinzento'],
  [/azul|marinho|navy|ganga|turquesa|petróleo|celeste/, 'Azul'],
  [/vermelho|bordeaux|bordô|vinho|cereja|coral/, 'Vermelho'],
  [/verde|oliva|menta|caqui|lima/, 'Verde'],
  [/amarelo|mostarda|dourado|ouro/, 'Amarelo'],
  [/bege|castanho|camel|creme|areia|conhaque|chocolate|nude|taupe|caramelo|cognac/, 'Bege'],
  [/multicolor|multicor|cores mistas|mistura/, 'Multicolor'],
]

function baseColors(color) {
  if (!color) return []
  const out = []
  for (const part of color.toLowerCase().split('/')) {
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
  const g = String(suitableFor || '').toLowerCase()
  const nums = sizes.map((s) => parseFloat(s)).filter((n) => Number.isFinite(n))
  if (g === 'children' || (nums.length && Math.max(...nums) < 35)) return 'crianca'
  if (g === 'male') return 'homem'
  if (g === 'female') return 'mulher'
  return 'unissexo'
}

// Categoria do Parjusto (filtro do catálogo). A 4 Elementos é sobretudo
// lifestyle; só muda quando o nome ou a descrição o dizem claramente.
function mapCategory(name, description) {
  const text = `${name} ${description || ''}`
  if (/\btrail\b|speedgoat|peregrine|xodus|cascadia|hierro|torrent/i.test(name)) return 'trail'
  if (/\bcaminhada\b|\bhiking\b|\bsenderismo\b/i.test(text)) return 'caminhada'
  if (/sapatilhas? de corrida|\bpara correr\b|\brunning de (estrada|asfalto)\b/i.test(text)) return 'running'
  if (/basquetebol|basketball|baloncesto/i.test(text)) return 'desporto'
  return 'lifestyle'
}

// ---------------------------------------------------------- Ficheiro CSV
const COLUMNS = [
  'aw_product_id', 'merchant_product_id', 'parent_product_id', 'product_name', 'brand_name', 'merchant_category',
  'description', 'colour', 'Fashion:suitable_for', 'Fashion:size', 'search_price', 'rrp_price', 'in_stock',
  'merchant_deep_link', 'merchant_image_url', 'large_image', 'alternate_image', 'ean', 'model_number',
]

function parseCsv(text) {
  const rows = []
  let row = []
  let f = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { f += '"'; i++ } else q = false
      } else f += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = '' }
    else if (c !== '\r') f += c
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  const [header, ...data] = rows
  return data.filter((r) => r.length >= header.length - 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

async function download() {
  const cols = encodeURIComponent(COLUMNS.join(','))
  const url = `https://productdata.awin.com/datafeed/download/apikey/${AWIN_KEY}/fid/${FEED_ID}/format/csv/language/pt/delimiter/%2C/compression/gzip/columns/${cols}/`
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url)
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      const { gunzipSync } = await import('node:zlib')
      const text = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString('utf8') : buf.toString('utf8')
      return parseCsv(text)
    }
    console.log(`Tentativa ${attempt}: HTTP ${res.status}`)
    await sleep(30_000)
  }
  throw new Error('Não consegui descarregar o ficheiro da Awin')
}

// ------------------------------------------------------------------ Main
const t0 = Date.now()
const now = new Date().toISOString()
const report = { mode: MODE, limit: LIMIT, activateNew: ACTIVATE_NEW, rows: 0, sneakerRows: 0, groups: 0, created: 0, createdOffers: 0, updatedOffers: 0, priceChanges: 0, markedOutOfStock: 0, matchedManual: 0, matchedImported: 0, skippedNoPrice: 0, photosDone: 0, photosFailed: 0, activated: 0, deactivated: 0, photoErrors: [], newBrands: [], categories: {}, genders: {}, brands: {}, created_slugs: [], errors: [] }
const inc = (o, k) => { o[k] = (o[k] || 0) + 1 }

try {
  // 1) O que já existe no Parjusto
  const [store] = await sb(`stores?slug=eq.${STORE_SLUG}&select=id`)
  if (!store) throw new Error(`Loja ${STORE_SLUG} não encontrada`)
  const brands = await sbAll('brands?select=id,slug,name')
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]))
  const products = await sbAll('products?select=id,slug,source,source_ref,image_url,is_active&order=id')
  const slugs = new Set(products.map((p) => p.slug))
  const productById = new Map(products.map((p) => [p.id, p]))
  const importedByRef = new Map(products.filter((p) => p.source === SOURCE).map((p) => [p.source_ref, p]))
  const gtinRows = await sbAll('product_gtins?select=ean,product_id,size')
  const productByEan = new Map(gtinRows.map((g) => [g.ean, g.product_id]))
  const storeOffers = await sbAll(`product_offers?store_id=eq.${store.id}&select=id,product_id,size,price,in_stock,discontinued_at`)
  console.log(`Parjusto: ${products.length} ténis, ${brands.length} marcas, ${gtinRows.length} EAN, ${storeOffers.length} ofertas 4 Elementos`)

  if (MODE !== 'photos') {
    // 2) Ler o ficheiro e juntar as linhas (uma por tamanho) por artigo
    const rows = await download()
    report.rows = rows.length
    const groups = new Map()
    for (const p of rows) {
      if (!SNEAKER_CATEGORY.test((p.merchant_category || '').trim())) continue
      report.sneakerRows++
      const gid = p.parent_product_id || p.merchant_product_id
      let g = groups.get(gid)
      if (!g) { g = { id: gid, first: p, rows: [] }; groups.set(gid, g) }
      const price = Number(p.search_price)
      g.rows.push({
        size: normSize(p['Fashion:size']),
        ean: ean13(p.ean),
        price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
        url: (p.merchant_deep_link || '').startsWith('https://') ? p.merchant_deep_link : null,
        inStock: p.in_stock !== '0',
      })
    }
    console.log(`Ficheiro: ${report.rows} linhas, ${report.sneakerRows} de ténis, ${groups.size} artigos`)

    // 3) Decidir o que fazer com cada artigo
    const toCreate = []
    const offerUpserts = []
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
        for (const r of gRows) {
          const key = `${productId}|${r.size}`
          if (seenOfferKeys.has(key)) continue
          seenOfferKeys.add(key)
          offerUpserts.push({ product_id: productId, store_id: store.id, size: r.size, price: r.price, currency: 'EUR', affiliate_url: r.url, in_stock: r.inStock, last_checked_at: now })
        }
        continue
      }
      toCreate.push({ g, rows: gRows })
    }

    // Modo teste: LIMIT ténis variados, alternando marcas.
    let createList = toCreate
    if (MODE === 'test') {
      const byBrand = new Map()
      for (const c of toCreate) {
        const b = mapBrand(c.g.first.brand_name).slug
        if (!byBrand.has(b)) byBrand.set(b, [])
        byBrand.get(b).push(c)
      }
      const lists = [...byBrand.values()].sort((a, b) => b.length - a.length)
      createList = []
      for (let i = 0; createList.length < LIMIT && lists.some((l) => i < l.length); i++) {
        for (const l of lists) if (i < l.length && createList.length < LIMIT) createList.push(l[i])
      }
    }

    // 4) Marcas novas
    const newBrands = new Map()
    for (const c of createList) {
      const b = mapBrand(c.g.first.brand_name)
      if (b.slug && !brandBySlug.has(b.slug) && !newBrands.has(b.slug)) newBrands.set(b.slug, { slug: b.slug, name: b.name })
    }
    if (newBrands.size) {
      const names = new Set(brands.map((b) => b.name.toLowerCase()))
      const rowsB = [...newBrands.values()].map((b) => (names.has(b.name.toLowerCase()) ? { ...b, name: `${b.name} (${b.slug})` } : b))
      await sbInsertChunks('brands', rowsB, { onConflict: 'slug', ignore: true })
      for (const b of await sbAll('brands?select=id,slug,name')) brandBySlug.set(b.slug, b)
      report.newBrands = [...newBrands.values()].map((b) => b.name)
    }

    // 5) Criar os ténis novos
    const newProducts = []
    const pending = []
    for (const c of createList) {
      const p = c.g.first
      const b = mapBrand(p.brand_name)
      const brand = brandBySlug.get(b.slug)
      if (!brand) { report.errors.push(`marca em falta: ${p.brand_name}`); continue }
      const model = modelName(p.product_name, p.brand_name, b.name)
      const color = (p.colour || '').trim() || null
      const gender = mapGender(p['Fashion:suitable_for'], c.rows.map((r) => r.size))
      const category = mapCategory(p.product_name, p.description)
      const base = slugify(`${b.slug} ${model} ${color || ''} ${gender === 'crianca' ? 'crianca' : ''}`).slice(0, 80).replace(/-+$/, '')
      let slug = base
      for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`
      slugs.add(slug)
      const photos = [p.merchant_image_url, p.large_image, p.alternate_image].filter((u, i, all) => u && u.startsWith('https://') && all.indexOf(u) === i)
      if (!photos.length) { report.errors.push(`sem foto: ${c.g.id}`); slugs.delete(slug); continue }
      newProducts.push({
        brand_id: brand.id,
        model_name: model,
        slug,
        category,
        gender,
        image_url: photos[0],
        image_urls: photos.slice(1),
        color,
        base_colors: baseColors(color),
        // sempre escondido ao criar: só fica visível depois de a foto estar
        // tratada (passo 7)
        is_active: false,
        source: SOURCE,
        source_ref: c.g.id,
        created_at: now,
        updated_at: now,
      })
      pending.push(c)
      inc(report.categories, category)
      inc(report.genders, gender)
      inc(report.brands, b.name)
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
      const importedIds = new Set(products.filter((p) => p.source).map((p) => p.id))
      const gone = storeOffers.filter((o) => importedIds.has(o.product_id) && o.in_stock && !seenOfferKeys.has(`${o.product_id}|${o.size}`)).map((o) => o.id)
      for (let i = 0; i < gone.length; i += 200) {
        await sb(`product_offers?id=in.(${gone.slice(i, i + 200).join(',')})`, { method: 'PATCH', body: { in_stock: false, last_checked_at: now }, prefer: 'return=minimal' })
      }
      report.markedOutOfStock = gone.length
    }
  } // fim de "if (MODE !== 'photos')"

  // 7) Fotos: tratar a foto principal dos ténis da 4 Elementos que ainda têm
  // a foto original da loja.
  if (MODE !== 'test' || report.created > 0) {
    const todo = (await sbAll(`products?source=eq.${SOURCE}&image_url=like.https://cdn.shopify.com*&select=id,slug,image_url,image_urls&order=created_at.desc`)).slice(0, PHOTO_LIMIT)
    console.log(`Fotos por tratar: ${todo.length}`)
    let next = 0
    async function worker() {
      while (next < todo.length) {
        const p = todo[next++]
        const candidates = [p.image_url, ...(p.image_urls ?? [])].filter((u) => u && u.startsWith('https://cdn.shopify.com'))
        let done = false
        for (const sourceUrl of candidates.slice(0, 2)) {
          try {
            const url = await processAndUpload({ supabaseUrl: SUPABASE_URL, key: SUPABASE_KEY, sourceUrl, path: `4elementos/${p.slug}.webp` })
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

  // 8) Visível / escondido: fica visível o ténis da 4 Elementos com foto
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
