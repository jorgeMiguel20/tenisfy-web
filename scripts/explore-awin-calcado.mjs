// scripts/explore-awin-calcado.mjs
//
// Segunda leitura do ficheiro da Awin, só para o calçado: descobre como
// agrupar os tamanhos por modelo/cor (qual o campo que identifica o produto),
// quantos modelos de calçado há por género e mostra exemplos sem endereços.
// Não mexe em nada no site nem na base de dados.
import { streamCsvRows } from './awin-csv.mjs'

const KEY = process.env.AWIN_API_KEY
const FEED_ID = process.env.AWIN_FEED_ID
if (!KEY || !FEED_ID) { console.error('Falta AWIN_API_KEY ou AWIN_FEED_ID'); process.exit(1) }
const COLUMNS = ['aw_product_id', 'merchant_product_id', 'parent_product_id', 'product_name', 'merchant_category', 'colour',
  'Fashion:suitable_for', 'Fashion:size', 'search_price', 'product_price_old', 'stock_quantity', 'ean', 'upc', 'mpn',
  'model_number', 'custom_1', 'custom_2', 'custom_4', 'merchant_image_url', 'large_image']
const url = `https://productdata.awin.com/datafeed/download/apikey/${KEY}/fid/${FEED_ID}/format/csv/language/pt/delimiter/%2C/compression/gzip/columns/${encodeURIComponent(COLUMNS.join(','))}/`
let res
for (let a = 1; a <= 3; a++) { res = await fetch(url); if (res.ok) break; await new Promise((r) => setTimeout(r, 30_000)) }
if (!res.ok) { console.error('Não consegui descarregar o ficheiro'); process.exit(1) }

const clean = (v) => String(v ?? '').replace(/https?:\/\/\S+/g, (u) => 'URL:' + u.split('/').pop().slice(0, 40)).slice(0, 80)
const isShoe = (c) => /^Calcado/i.test(c)
const byMpn = new Map(), byName = new Map(), byEan = new Set(), byArticle = new Map()
const cats = {}, gender = {}, sub = {}
const samples = []
let shoes = 0, n = 0
for await (const r of streamCsvRows(res)) {
  n++
  if (!isShoe(r.merchant_category)) continue
  shoes++
  cats[r.merchant_category] = (cats[r.merchant_category] || 0) + 1
  gender[r['Fashion:suitable_for']] = (gender[r['Fashion:suitable_for']] || 0) + 1
  const art = (r.merchant_product_id.match(/[A-Z]{1,3}\d{4}/) || [''])[0]
  byMpn.set(r.mpn, (byMpn.get(r.mpn) || 0) + 1)
  byName.set(r.product_name + '|' + r.colour, (byName.get(r.product_name + '|' + r.colour) || 0) + 1)
  byArticle.set(art, (byArticle.get(art) || 0) + 1)
  if (r.ean) byEan.add(r.ean)
  if (shoes % 2500 === 1 && samples.length < 10) samples.push(r)
}
const dist = (m) => { const d = {}; for (const v of m.values()) d[v] = (d[v] || 0) + 1; return Object.fromEntries(Object.entries(d).sort((a, b) => a[0] - b[0]).slice(0, 25)) }
console.log('LINHAS', n, 'CALCADO', shoes)
console.log('CATEGORIAS', JSON.stringify(cats))
console.log('GENERO', JSON.stringify(gender))
console.log('MPN distintos', byMpn.size, 'tamanhos por mpn', JSON.stringify(dist(byMpn)))
console.log('NOME+COR distintos', byName.size, 'tamanhos por nome+cor', JSON.stringify(dist(byName)))
console.log('ARTIGO distintos', byArticle.size, 'EAN distintos', byEan.size)
for (const s of samples) console.log('EXEMPLO ' + COLUMNS.map((c) => c.replace('Fashion:', '') + '=' + clean(s[c])).join(' ; '))
