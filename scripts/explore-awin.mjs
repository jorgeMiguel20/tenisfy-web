// scripts/explore-awin.mjs
//
// Modo "explorar" para um ficheiro de produtos da Awin: descarrega o ficheiro
// (o número vem em AWIN_FEED_ID) e escreve no registo da execução um resumo -
// número de linhas, categorias, géneros, tamanhos, quantas linhas têm cada
// campo preenchido e alguns exemplos. Não mexe em nada no site nem na base de
// dados. Serve para decidir as regras do importador.
// A chave da Awin vem do "secret" AWIN_API_KEY e nunca é escrita no registo.
import { streamCsvRows } from './awin-csv.mjs'

const KEY = process.env.AWIN_API_KEY
const FEED_ID = process.env.AWIN_FEED_ID
if (!KEY || !FEED_ID) { console.error('Falta AWIN_API_KEY ou AWIN_FEED_ID'); process.exit(1) }

const COLUMNS = [
  'aw_product_id', 'merchant_product_id', 'parent_product_id', 'product_name', 'brand_name', 'merchant_category',
  'category_name', 'colour', 'Fashion:suitable_for', 'Fashion:size', 'search_price', 'rrp_price',
  'product_price_old', 'in_stock', 'stock_quantity', 'merchant_deep_link', 'aw_deep_link', 'merchant_image_url',
  'large_image', 'aw_image_url', 'alternate_image', 'alternate_image_two', 'alternate_image_three',
  'alternate_image_four', 'ean', 'upc', 'mpn', 'model_number', 'custom_1', 'custom_2', 'custom_3', 'custom_4',
  'custom_5', 'custom_6', 'delivery_cost',
]

const cols = encodeURIComponent(COLUMNS.join(','))
const url = `https://productdata.awin.com/datafeed/download/apikey/${KEY}/fid/${FEED_ID}/format/csv/language/pt/delimiter/%2C/compression/gzip/columns/${cols}/`
let res
for (let attempt = 1; attempt <= 3; attempt++) {
  res = await fetch(url)
  if (res.ok) break
  console.log(`Tentativa ${attempt}: HTTP ${res.status}`)
  await new Promise((r) => setTimeout(r, 30_000))
}
if (!res.ok) { console.error('Não consegui descarregar o ficheiro'); process.exit(1) }

const FIELDS = ['merchant_category', 'category_name', 'Fashion:suitable_for', 'in_stock', 'brand_name', 'Fashion:size', 'colour', 'custom_1', 'custom_2', 'custom_3', 'custom_4', 'custom_5', 'custom_6']
const counts = Object.fromEntries(FIELDS.map((f) => [f, {}]))
const filled = {}
const groups = new Set()
const samples = []
let header = null
let rows = 0
for await (const r of streamCsvRows(res)) {
  if (!header) header = Object.keys(r)
  rows++
  for (const h of header) if (r[h] && r[h] !== '0') filled[h] = (filled[h] || 0) + 1
  for (const f of FIELDS) { const k = r[f] || '(vazio)'; counts[f][k] = (counts[f][k] || 0) + 1 }
  groups.add(r.parent_product_id || r.merchant_product_id)
  if (rows % 9000 === 1 && samples.length < 8) {
    const s = { ...r }
    for (const k of Object.keys(s)) s[k] = String(s[k]).slice(0, 200)
    samples.push(s)
  }
}
const top = (o, n) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n))
console.log(JSON.stringify({ feed: FEED_ID, rows, distinctGroups: groups.size, header, filled }, null, 1))
for (const f of FIELDS) console.log(`CONTAGEM ${f}:`, JSON.stringify(top(counts[f], f === 'Fashion:size' ? 70 : 40)))
for (const s of samples) console.log('EXEMPLO', JSON.stringify(s))
