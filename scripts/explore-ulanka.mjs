// scripts/explore-ulanka.mjs
//
// Modo "explorar" para o ficheiro de produtos da Ulanka (Tradedoubler,
// feed 258453): descarrega o ficheiro completo (é pequeno) e conta o que lá
// está - categorias, marcas, géneros, tamanhos, preços, portes - sem mexer
// em nada no site. O resumo fica guardado na tabela import_runs do Supabase
// (source 'ulanka', mode 'explore') e é também escrito no registo.
import { streamProducts } from './feed-stream.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TD_TOKEN = process.env.TRADEDOUBLER_TOKEN
const FEED_ID = process.env.TD_FEED_ID || '258453'

function need(v, name) {
  if (!v) { console.error(`Falta a variável ${name}`); process.exit(1) }
}
need(SUPABASE_URL, 'SUPABASE_URL'); need(SUPABASE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'); need(TD_TOKEN, 'TRADEDOUBLER_TOKEN')

async function saveReport(mode, report) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/import_runs`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ source: 'ulanka', mode, finished_at: new Date().toISOString(), report }),
  })
  if (!r.ok) console.error('Não consegui guardar o resumo:', r.status, await r.text())
  else console.log('Resumo guardado em import_runs.')
}

async function download() {
  const url = `https://api.tradedoubler.com/1.0/productsUnlimited.json;fid=${FEED_ID}?token=${TD_TOKEN}`
  for (let attempt = 1; attempt <= 30; attempt++) {
    const res = await fetch(url)
    if (res.status === 200) return res
    const body = await res.text().catch(() => '')
    console.log(`Tentativa ${attempt}: HTTP ${res.status} ${body.slice(0, 120)}`)
    if (res.status !== 202) throw new Error(`HTTP ${res.status}`)
    await new Promise((r) => setTimeout(r, 60_000))
  }
  throw new Error('O ficheiro não ficou pronto a tempo')
}

const inc = (obj, key, n = 1) => { const k = key == null || key === '' ? '(vazio)' : String(key); obj[k] = (obj[k] || 0) + n }
const top = (obj, n) => Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n))
const field = (p, name) => (p.fields || []).find((f) => f.name === name)?.value

const t0 = Date.now()
const stats = {}
const report = {
  total: 0, parseErrors: 0, categories: {}, brands: {}, gender: {}, age: {}, sizes: {}, fieldNames: {},
  currency: {}, inStock: {}, shipping: {}, withEan: 0, withImage: 0, withUrl: 0,
  priceMin: null, priceMax: null, priceBuckets: {},
  nameWords: {}, samplesRaw: [], samples: [], keys: null,
}
const ids = new Set()
try {
  const res = await download()
  report.contentType = res.headers.get('content-type')
  report.contentLength = res.headers.get('content-length')
  for await (const raw of streamProducts(res, stats)) {
    report.total++
    let p
    try { p = JSON.parse(raw) } catch { report.parseErrors++; continue }
    if (!report.keys) report.keys = Object.keys(p)
    if (report.samplesRaw.length < 3) report.samplesRaw.push(raw.slice(0, 3500))
    for (const f of p.fields || []) inc(report.fieldNames, f.name)
    const cats = (p.categories || []).map((c) => c.name || c.tdCategoryName || JSON.stringify(c))
    for (const c of cats) inc(report.categories, c)
    inc(report.brands, p.brand)
    inc(report.gender, field(p, 'gender'))
    inc(report.age, field(p, 'age_group'))
    inc(report.sizes, p.size)
    for (const o of p.offers || []) {
      inc(report.currency, o.priceHistory?.[0]?.price?.currency)
      inc(report.inStock, o.inStock)
      inc(report.shipping, o.shippingCost)
      const price = Number(o.priceHistory?.[0]?.price?.value)
      if (Number.isFinite(price)) {
        report.priceMin = report.priceMin == null ? price : Math.min(report.priceMin, price)
        report.priceMax = report.priceMax == null ? price : Math.max(report.priceMax, price)
        inc(report.priceBuckets, price < 30 ? '<30' : price < 60 ? '30-60' : price < 100 ? '60-100' : price < 150 ? '100-150' : '>=150')
      }
      if (o.productUrl) report.withUrl++
    }
    if (p.identifiers?.ean) report.withEan++
    if (p.productImage?.url) report.withImage++
    for (const w of String(p.name || '').toLowerCase().split(/[^a-zà-ú0-9]+/)) if (w.length > 2) inc(report.nameWords, w)
    ids.add(field(p, 'item_grouping_id') || p.groupingId || p.name)
    if (report.samples.length < 60 && Math.random() < 0.06) {
      report.samples.push({ name: p.name, brand: p.brand, model: field(p, 'model'), color: field(p, 'color'), cats, size: p.size, ean: p.identifiers?.ean, price: p.offers?.[0]?.priceHistory?.[0]?.price?.value, shipping: p.offers?.[0]?.shippingCost, stock: p.offers?.[0]?.inStock })
    }
  }
} catch (e) {
  report.error = String(e?.stack || e)
  console.error(e)
}
report.groups = ids.size
report.stream = stats
report.seconds = Math.round((Date.now() - t0) / 1000)
report.categories = top(report.categories, 200)
report.brands = top(report.brands, 200)
report.sizes = top(report.sizes, 100)
report.nameWords = top(report.nameWords, 120)
console.log(`Total ${report.total}, artigos ${report.groups}, ${report.seconds}s`)
console.log(JSON.stringify({ ...report, samplesRaw: undefined }, null, 1).slice(0, 12000))
console.log('--- amostra bruta ---')
for (const s of report.samplesRaw) console.log(s)
await saveReport('explore', report)
