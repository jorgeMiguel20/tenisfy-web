// scripts/feed-explore.mjs
//
// Modo "explorar": descarrega o ficheiro completo da About You
// (Tradedoubler) e conta o que lá está - categorias, marcas, géneros,
// tamanhos - sem mexer em nenhum ténis do site. O resumo fica guardado na
// tabela import_runs do Supabase. Serve para decidir as regras da
// importação (que categorias entram, como se traduzem para o Parjusto).
import { streamProducts } from './feed-stream.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TD_TOKEN = process.env.TRADEDOUBLER_TOKEN
const FEED_ID = process.env.TD_FEED_ID || '119264'

function need(v, name) {
  if (!v) { console.error(`Falta a variável ${name}`); process.exit(1) }
}
need(SUPABASE_URL, 'SUPABASE_URL'); need(SUPABASE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'); need(TD_TOKEN, 'TRADEDOUBLER_TOKEN')

async function saveReport(mode, report) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/import_runs`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ source: 'aboutyou', mode, finished_at: new Date().toISOString(), report }),
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

const inc = (obj, key, n = 1) => { obj[key] = (obj[key] || 0) + n }
const top = (obj, n) => Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n))
const field = (p, name) => (p.fields || []).find((f) => f.name === name)?.value

const t0 = Date.now()
const stats = {}
const report = { total: 0, footwear: 0, groups: 0, categories: {}, cat2: {}, cat3: {}, cat4: {}, cat5: {}, brands: {}, gender: {}, age: {}, sizes: {}, sizeSystem: {}, samples: [], keys: null, fieldNames: {} }
const groups = new Set()
try {
  const res = await download()
  report.contentType = res.headers.get('content-type')
  report.contentLength = res.headers.get('content-length')
  for await (const raw of streamProducts(res, stats)) {
    report.total++
    if (!/Sapat|Chutei|Cal[cç]ado|T[eé]nis/i.test(raw)) continue
    let p
    try { p = JSON.parse(raw) } catch { inc(report, 'parseErrors'); continue }
    if (!report.sampleRaw && /Sapatilhas/.test(raw)) { report.sampleRaw = raw.slice(0, 4000); report.sampleKeys = Object.keys(p) }
    const fieldCats = ['1st_category', '2nd_category', '3rd_category', '4th_category', '5th_category'].map((n) => field(p, n)).filter(Boolean)
    const paths = (p.categories || []).map((c) => c.name || c.tdCategoryName || JSON.stringify(c))
    if (paths.length === 0 && fieldCats.length) paths.push(fieldCats.join(' - '))
    if (!paths.some((c) => /(^| - )(Sapatos|Calçado)( - |$)|Sapatilhas|Chuteiras/i.test(c)) && !fieldCats.some((c) => /^(Sapatos|Calçado|Sapatilhas|Chuteiras)/i.test(c))) continue
    report.footwear++
    if (!report.keys) report.keys = Object.keys(p)
    for (const f of p.fields || []) inc(report.fieldNames, f.name)
    const g = field(p, 'item_grouping_id') || p.groupingId
    const isNewGroup = !groups.has(g)
    groups.add(g)
    for (const c of paths) inc(report.categories, c.split(' - ').slice(1).join(' > '))
    inc(report.cat2, field(p, '2nd_category'))
    inc(report.cat3, field(p, '3rd_category'))
    inc(report.cat4, field(p, '4th_category'))
    inc(report.cat5, field(p, '5th_category'))
    if (isNewGroup) inc(report.brands, p.brand)
    inc(report.gender, field(p, 'gender'))
    inc(report.age, field(p, 'age_group'))
    inc(report.sizes, p.size)
    inc(report.sizeSystem, field(p, 'size_system'))
    if (isNewGroup && report.samples.length < 40 && Math.random() < 0.01) {
      report.samples.push({ name: p.name, brand: p.brand, model: field(p, 'model'), color: field(p, 'color'), cats: paths, img: p.productImage?.url, size: p.size, ean: p.identifiers?.ean })
    }
    if (report.footwear % 20000 === 0) console.log(`${report.footwear} linhas de calçado...`)
  }
} catch (e) {
  report.error = String(e?.stack || e)
  console.error(e)
}
report.groups = groups.size
report.stream = stats
report.seconds = Math.round((Date.now() - t0) / 1000)
report.categories = top(report.categories, 400)
report.brands = top(report.brands, 400)
report.sizes = top(report.sizes, 300)
console.log(`Total ${report.total}, calçado ${report.footwear}, artigos ${report.groups}, ${report.seconds}s`)
await saveReport('explore', report)
