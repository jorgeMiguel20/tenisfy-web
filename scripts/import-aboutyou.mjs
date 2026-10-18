// scripts/import-aboutyou.mjs
//
// Importa os ténis da About You a partir do ficheiro completo de produtos da
// Tradedoubler (feed "PT Best Performer"). Corre no GitHub Actions
// (.github/workflows/import-aboutyou.yml), com as chaves guardadas nos
// "secrets" do repositório.
//
// O que faz, por cada artigo (um modelo numa cor) da About You:
//   1. Só fica com sapatilhas/ténis (lifestyle, corrida, trail, caminhada,
//      ginásio, pavilhão...). Botas, sandálias, chinelos, pantufas, sabrinas e
//      sapatos clássicos ficam de fora.
//   2. Procura se o ténis já existe no Parjusto:
//      - pelo código de barras (EAN) de algum tamanho (tabela product_gtins);
//      - ou porque já tem ofertas da About You com o mesmo número de artigo.
//      Se for um ténis criado à mão (os 48 originais), não lhe mexe - esses
//      continuam a ser geridos como até agora.
//   3. Se for um ténis já importado antes: atualiza preço e stock de cada
//      tamanho. Se não existir: cria o ténis (marca, modelo, cor, género,
//      categoria, fotos da About You) e uma oferta por tamanho.
//   4. Tamanhos que deixaram de aparecer no ficheiro ficam "esgotados".
//
// Modos (variável MODE):
//   test - cria no máximo LIMIT ténis novos (50 por defeito), ESCONDIDOS
//          (is_active = false), e não mexe em mais nada. Serve para o Jorge
//          ver como ficam antes de aprovar.
//   full - faz tudo: cria os ténis novos já visíveis (ACTIVATE_NEW=true) ou
//          escondidos, e atualiza preços/stock dos já importados.
// O resumo de cada execução fica na tabela import_runs.
import { streamProducts } from './feed-stream.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TD_TOKEN = process.env.TRADEDOUBLER_TOKEN
const FEED_ID = process.env.TD_FEED_ID || '119264'
const MODE = process.env.MODE || 'test'
const LIMIT = Number(process.env.LIMIT || 50)
const ACTIVATE_NEW = process.env.ACTIVATE_NEW === 'true'
const SOURCE = 'aboutyou'
const STORE_SLUG = 'about-you'

for (const [v, n] of [[SUPABASE_URL, 'SUPABASE_URL'], [SUPABASE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'], [TD_TOKEN, 'TRADEDOUBLER_TOKEN']]) {
  if (!v) { console.error(`Falta a variável ${n}`); process.exit(1) }
}
if (!['test', 'full'].includes(MODE)) { console.error(`Modo desconhecido: ${MODE}`); process.exit(1) }

// ---------------------------------------------------------------- Supabase
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ------------------------------------------------------------------ Regras
const field = (p, name) => {
  const v = (p.fields || []).find((f) => f.name === name)?.value
  return v && v !== 'undefined' ? String(v) : null
}

// Calçado que NÃO é ténis.
const EXCLUDE = /Botas|Botins|Sandálias|Chinelos|Pantufas|Sabrinas|Socas|Saltos|Praia e Surf|Sapatos Clássicos|Mocassins|Alpercatas|Sapatos de vela|Sapatos baixos/i
// Calçado que é ténis.
const SNEAKER = /Sapatilha|Sapatos de caminhada|Sapatos de fitness|Tipos de desporto > (Corrida|Outdoor|Fitness)/i

function categoryPaths(p) {
  const paths = (p.categories || []).map((c) => c.name).filter(Boolean)
  const fromFields = ['1st_category', '2nd_category', '3rd_category', '4th_category', '5th_category'].map((n) => field(p, n)).filter(Boolean)
  if (fromFields.length) paths.push(fromFields.join(' - '))
  return paths.map((c) => c.split(' - ').join(' > '))
}

function isSneakerGroup(paths) {
  if (paths.some((c) => EXCLUDE.test(c.split(' > ').slice(-2).join(' > ')))) return false
  return paths.some((c) => SNEAKER.test(c))
}

// Categoria do Parjusto (aparece como filtro no catálogo).
function mapCategory(paths) {
  const all = paths.join(' | ')
  if (/Trailrunning|Trail/i.test(all)) return 'trail'
  if (/Tipos de desporto > Corrida|Sapatilhas de desporto > Sapatilhas de corrida/i.test(all)) return 'running'
  if (/caminhada|Tipos de desporto > Outdoor|Sapatos outdoor/i.test(all)) return 'caminhada'
  if (/pavilh/i.test(all)) return 'indoor'
  if (/Fitness/i.test(all)) return 'treino'
  if (/Sapatilhas de desporto/i.test(all) && !/Streetwear|Sapatilhas baixas|Sapatilhas altas/i.test(all)) return 'desporto'
  return 'lifestyle'
}

function mapGender(p) {
  const g = (field(p, 'gender') || '').toLowerCase()
  const age = (field(p, 'age_group') || '').toLowerCase()
  if (['boy', 'girl', 'kids'].includes(g) || ['kids', 'babys', 'teens'].includes(age)) return 'crianca'
  if (g === 'male') return 'homem'
  if (g === 'female') return 'mulher'
  return 'unissexo'
}

// Marcas: junta as sub-marcas da About You à marca principal (ex.: "ADIDAS
// ORIGINALS" e "ADIDAS PERFORMANCE" são "adidas").
const BRAND_ALIASES = [
  [/^adidas( originals| performance| sportswear| terrex| by stella mccartney)?$/i, 'adidas', 'adidas'],
  [/^nike( sportswear| performance)?$/i, 'nike', 'Nike'],
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
  [/^on$/i, 'on', 'On'],
]

export function slugify(s) {
  return String(s)
    .replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/ø/g, 'o').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function prettyBrand(raw) {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (name !== name.toUpperCase()) return name
  // TUDO EM MAIÚSCULAS -> "Tom Tailor". Marcas curtas de uma só palavra
  // ("UGG", "MJUS") e siglas como "US" ficam como estão.
  const words = name.split(' ')
  if (words.length === 1 && name.length <= 4) return name
  const KEEP = new Set(['US', 'UK', 'DC', 'CK', 'DKNY', 'BOSS', 'MCM'])
  return words.map((w) => (KEEP.has(w.replace(/\.$/, '')) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(' ')
}

function mapBrand(raw) {
  const name = (raw || '').trim().replace(/\s+/g, ' ')
  for (const [re, slug, display] of BRAND_ALIASES) if (re.test(name)) return { slug, name: display }
  const pretty = prettyBrand(name)
  return { slug: slugify(pretty), name: pretty }
}

function modelName(p, brandRaw) {
  const m = field(p, 'model')
  if (m) return m.trim()
  const quoted = (p.name || '').match(/'([^']+)'/)
  if (quoted) return quoted[1].trim()
  let n = (p.name || '').split(/\s{2,}/)[0]
  if (brandRaw && n.toLowerCase().startsWith(brandRaw.toLowerCase())) n = n.slice(brandRaw.length)
  return n.trim() || 'Sapatilhas'
}

function colorText(p) {
  const c = field(p, 'color')
  if (c) return c.charAt(0).toUpperCase() + c.slice(1)
  const tail = (p.name || '').split(/\s{2,}/)[1]
  return tail ? tail.charAt(0).toUpperCase() + tail.slice(1) : null
}

const BASE_COLORS = [
  [/preto|negro|antracite/, 'Preto'],
  [/branco|offwhite|off-white|marfim/, 'Branco'],
  [/cinzento|prata|cinza|platina|grafite/, 'Cinzento'],
  [/azul|marinho|navy|ganga|turquesa|petróleo|celeste/, 'Azul'],
  [/vermelho|bordeaux|bordô|vinho|cereja|coral/, 'Vermelho'],
  [/verde|oliva|menta|caqui|lima/, 'Verde'],
  [/amarelo|mostarda|dourado|ouro/, 'Amarelo'],
  [/bege|castanho|camel|creme|areia|conhaque|chocolate|nude|taupe|cor de pele|caramelo|cognac/, 'Bege'],
  [/multicolor|cores mistas|mistura/, 'Multicolor'],
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

// "42,5-43" -> "42.5-43"; "35xregular" -> "35"
function normSize(s) {
  return String(s || '').trim().replace(/x?regular$/i, '').replace(/,/g, '.').replace(/\s+/g, ' ').trim()
}

function directUrl(productUrl) {
  if (!productUrl) return null
  const m = productUrl.match(/url\((.+)\)$/)
  if (!m) return productUrl.startsWith('https://www.aboutyou') ? productUrl : null
  try { return decodeURIComponent(m[1]) } catch { return null }
}

function ayArticleId(url) {
  const m = (url || '').match(/aboutyou\.pt\/p\/[^?#]*?-(\d+)(?:[?#/]|$)/)
  return m ? m[1] : null
}

function ean13(e) {
  const s = String(e || '').replace(/\D/g, '')
  if (s.length < 8 || s.length > 14) return null
  return s.length < 13 ? s.padStart(13, '0') : s
}

// ----------------------------------------------------------- Descarregar
async function download() {
  const url = `https://api.tradedoubler.com/1.0/productsUnlimited.json;fid=${FEED_ID}?token=${TD_TOKEN}`
  for (let attempt = 1; attempt <= 30; attempt++) {
    const res = await fetch(url)
    if (res.status === 200) return res
    const body = await res.text().catch(() => '')
    console.log(`Tentativa ${attempt}: HTTP ${res.status} ${body.slice(0, 120)}`)
    if (res.status !== 202) throw new Error(`HTTP ${res.status}`)
    await sleep(60_000)
  }
  throw new Error('O ficheiro não ficou pronto a tempo')
}

// ------------------------------------------------------------------ Main
const t0 = Date.now()
const now = new Date().toISOString()
const report = { mode: MODE, limit: LIMIT, activateNew: ACTIVATE_NEW, rows: 0, sneakerRows: 0, groups: 0, created: 0, createdOffers: 0, updatedOffers: 0, priceChanges: 0, markedOutOfStock: 0, matchedManual: 0, matchedImported: 0, skippedNoPrice: 0, newBrands: [], categories: {}, genders: {}, created_slugs: [], errors: [] }
const inc = (o, k) => { o[k] = (o[k] || 0) + 1 }

try {
  // 1) O que já existe no Parjusto
  const [store] = await sb(`stores?slug=eq.${STORE_SLUG}&select=id`)
  if (!store) throw new Error('Loja about-you não encontrada')
  const brands = await sbAll('brands?select=id,slug,name')
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]))
  const products = await sbAll('products?select=id,slug,source,source_ref')
  const slugs = new Set(products.map((p) => p.slug))
  const productById = new Map(products.map((p) => [p.id, p]))
  const importedByRef = new Map(products.filter((p) => p.source === SOURCE).map((p) => [p.source_ref, p]))
  const gtinRows = await sbAll('product_gtins?select=ean,product_id,size')
  const productByEan = new Map(gtinRows.map((g) => [g.ean, g.product_id]))
  const ayOffers = await sbAll(`product_offers?store_id=eq.${store.id}&select=id,product_id,size,price,in_stock,affiliate_url,discontinued_at`)
  const productByAyArticle = new Map()
  for (const o of ayOffers) {
    const a = ayArticleId(o.affiliate_url)
    if (a && !productByAyArticle.has(a)) productByAyArticle.set(a, o.product_id)
  }
  console.log(`Parjusto: ${products.length} ténis, ${brands.length} marcas, ${gtinRows.length} EAN, ${ayOffers.length} ofertas About You`)

  // 2) Ler o ficheiro e juntar as linhas (uma por tamanho) por artigo
  const groups = new Map()
  const res = await download()
  for await (const raw of streamProducts(res)) {
    report.rows++
    if (!raw.includes('Sapat')) continue
    let p
    try { p = JSON.parse(raw) } catch { continue }
    const paths = categoryPaths(p)
    if (!paths.some((c) => SNEAKER.test(c))) continue
    report.sneakerRows++
    const gid = field(p, 'item_grouping_id') || p.groupingId
    let g = groups.get(gid)
    if (!g) { g = { id: gid, first: p, paths: new Set(), rows: [] }; groups.set(gid, g) }
    for (const c of paths) g.paths.add(c)
    const offer = p.offers?.[0]
    const price = Number(offer?.priceHistory?.[0]?.price?.value)
    const stock = field(p, 'stock_quantity')
    g.rows.push({
      size: normSize(p.size),
      ean: ean13(p.identifiers?.ean),
      price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
      url: directUrl(offer?.productUrl),
      inStock: stock == null ? true : Number(stock) > 0,
      image: p.productImage?.url || null,
    })
  }
  console.log(`Ficheiro: ${report.rows} linhas, ${report.sneakerRows} de ténis, ${groups.size} artigos`)

  // 3) Decidir o que fazer com cada artigo
  const toCreate = []
  const offerUpserts = [] // para ténis já importados
  const seenOfferKeys = new Set()
  for (const g of groups.values()) {
    const paths = [...g.paths]
    if (!isSneakerGroup(paths)) continue
    report.groups++
    const rows = g.rows.filter((r) => r.size && r.price && r.url)
    if (rows.length === 0) { report.skippedNoPrice++; continue }

    let productId = importedByRef.get(g.id)?.id
    if (!productId) {
      for (const r of rows) if (r.ean && productByEan.has(r.ean)) { productId = productByEan.get(r.ean); break }
    }
    if (!productId && productByAyArticle.has(g.id)) productId = productByAyArticle.get(g.id)

    if (productId) {
      const prod = productById.get(productId)
      if (!prod || prod.source !== SOURCE) { report.matchedManual++; continue } // ténis criado à mão: não mexer
      report.matchedImported++
      if (MODE === 'test') continue
      for (const r of rows) {
        const key = `${productId}|${r.size}`
        if (seenOfferKeys.has(key)) continue
        seenOfferKeys.add(key)
        offerUpserts.push({ product_id: productId, store_id: store.id, size: r.size, price: r.price, currency: 'EUR', affiliate_url: r.url, in_stock: r.inStock, last_checked_at: now })
      }
      continue
    }
    toCreate.push({ g, paths, rows })
  }

  // Modo teste: escolher LIMIT ténis variados (alternando categorias e géneros)
  let createList = toCreate
  if (MODE === 'test') {
    const buckets = new Map()
    for (const c of toCreate) {
      const k = `${mapCategory(c.paths)}|${mapGender(c.g.first)}`
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k).push(c)
    }
    // dentro de cada grupo, primeiro os que têm mais tamanhos (mais úteis)
    for (const list of buckets.values()) list.sort((a, b) => b.rows.length - a.rows.length)
    createList = []
    const lists = [...buckets.values()]
    for (let i = 0; createList.length < LIMIT && lists.some((l) => i < l.length); i++) {
      for (const l of lists) if (i < l.length && createList.length < LIMIT) createList.push(l[i])
    }
  }

  // 4) Marcas novas
  const newBrands = new Map()
  for (const c of createList) {
    const b = mapBrand(c.g.first.brand)
    if (b.slug && !brandBySlug.has(b.slug) && !newBrands.has(b.slug)) newBrands.set(b.slug, { slug: b.slug, name: b.name })
  }
  if (newBrands.size) {
    // nome também é único na tabela: evitar choque com marcas com o mesmo nome
    const names = new Set(brands.map((b) => b.name.toLowerCase()))
    const rows = [...newBrands.values()].map((b) => (names.has(b.name.toLowerCase()) ? { ...b, name: `${b.name} (${b.slug})` } : b))
    const inserted = await sbInsertChunks('brands', rows, { onConflict: 'slug', ignore: true, returning: true })
    for (const b of inserted) brandBySlug.set(b.slug, b)
    const again = await sbAll('brands?select=id,slug,name')
    for (const b of again) brandBySlug.set(b.slug, b)
    report.newBrands = rows.map((b) => b.name)
  }

  // 5) Criar os ténis novos
  const newProducts = []
  const pending = []
  for (const c of createList) {
    const p = c.g.first
    const b = mapBrand(p.brand)
    const brand = brandBySlug.get(b.slug)
    if (!brand) { report.errors.push(`marca em falta: ${p.brand}`); continue }
    const model = modelName(p, p.brand)
    const color = colorText(p)
    const category = mapCategory(c.paths)
    const gender = mapGender(p)
    let base = slugify(`${b.slug} ${model} ${(color || '').split('/').slice(0, 2).join(' ')} ${gender === 'crianca' ? 'crianca' : ''}`).slice(0, 80).replace(/-+$/, '')
    let slug = base
    for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`
    slugs.add(slug)
    const gallery = ['imgurlp2', 'imgurlp3', 'imgurlp4', 'imgurlp5', 'imgurlp6'].map((n) => field(p, n)).filter((u) => u && u.startsWith('http'))
    const image = c.rows.find((r) => r.image)?.image || gallery[0] || null
    if (!image) { report.errors.push(`sem foto: ${c.g.id}`); slugs.delete(slug); continue }
    newProducts.push({
      brand_id: brand.id,
      model_name: model,
      slug,
      category,
      gender,
      image_url: image,
      image_urls: gallery.filter((u) => u !== image),
      color,
      base_colors: baseColors(color),
      is_active: MODE === 'test' ? false : ACTIVATE_NEW,
      source: SOURCE,
      source_ref: c.g.id,
      created_at: now,
      updated_at: now,
    })
    pending.push(c)
    inc(report.categories, category)
    inc(report.genders, gender)
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
    const existingByKey = new Map(ayOffers.map((o) => [`${o.product_id}|${o.size}`, o]))
    const changedPrice = []
    const toWrite = []
    for (const u of offerUpserts) {
      const old = existingByKey.get(`${u.product_id}|${u.size}`)
      toWrite.push(u)
      if (!old || Number(old.price) !== u.price) changedPrice.push(u)
    }
    const written = await sbInsertChunks('product_offers', toWrite, { onConflict: 'product_id,store_id,size', returning: true })
    report.updatedOffers = written.length
    const idByKey = new Map(written.map((o) => [`${o.product_id}|${o.size}`, o.id]))
    const history = changedPrice.map((u) => ({ product_offer_id: idByKey.get(`${u.product_id}|${u.size}`), price: u.price, recorded_at: now })).filter((h) => h.product_offer_id)
    await sbInsertChunks('price_history', history)
    report.priceChanges = history.length

    // tamanhos de ténis importados que já não estão no ficheiro -> esgotados
    const importedIds = new Set(products.filter((p) => p.source === SOURCE).map((p) => p.id))
    const gone = ayOffers.filter((o) => importedIds.has(o.product_id) && o.in_stock && !seenOfferKeys.has(`${o.product_id}|${o.size}`)).map((o) => o.id)
    for (let i = 0; i < gone.length; i += 200) {
      await sb(`product_offers?id=in.(${gone.slice(i, i + 200).join(',')})`, { method: 'PATCH', body: { in_stock: false, last_checked_at: now }, prefer: 'return=minimal' })
    }
    report.markedOutOfStock = gone.length
  }
} catch (e) {
  report.errors.push(String(e?.stack || e).slice(0, 2000))
  console.error(e)
}

report.seconds = Math.round((Date.now() - t0) / 1000)
console.log(JSON.stringify({ ...report, created_slugs: undefined }, null, 1))
try {
  await sb('import_runs', { method: 'POST', body: { source: SOURCE, mode: MODE, started_at: new Date(t0).toISOString(), finished_at: new Date().toISOString(), report }, prefer: 'return=minimal' })
} catch (e) { console.error('Não consegui guardar o resumo:', e) }
if (report.errors.length) process.exitCode = 1
