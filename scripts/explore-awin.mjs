// scripts/explore-awin.mjs
//
// Modo "explorar" para um ficheiro de produtos da Awin: descarrega o ficheiro
// (o número vem em AWIN_FEED_ID), e escreve no registo da execução um
// resumo - número de linhas, categorias, géneros, tamanhos, quantas linhas têm
// cada campo preenchido e alguns exemplos. Não mexe em nada no site nem na
// base de dados. Serve para decidir as regras do importador.
// A chave da Awin vem do "secret" AWIN_API_KEY e nunca é escrita no registo.
import { gunzipSync } from 'node:zlib'

const KEY = process.env.AWIN_API_KEY
const FEED_ID = process.env.AWIN_FEED_ID
if (!KEY || !FEED_ID) { console.error('Falta AWIN_API_KEY ou AWIN_FEED_ID'); process.exit(1) }

const COLUMNS = [
  'aw_product_id', 'merchant_product_id', 'parent_product_id', 'product_name', 'brand_name', 'merchant_category',
  'category_name', 'description', 'colour', 'Fashion:suitable_for', 'Fashion:size', 'search_price', 'rrp_price',
  'product_price_old', 'in_stock', 'stock_quantity', 'merchant_deep_link', 'aw_deep_link', 'merchant_image_url',
  'large_image', 'aw_image_url', 'alternate_image', 'alternate_image_two', 'alternate_image_three',
  'alternate_image_four', 'ean', 'upc', 'mpn', 'model_number', 'custom_1', 'custom_2', 'custom_3', 'custom_4',
  'custom_5', 'custom_6', 'delivery_cost', 'specifications',
]

function parseCsv(text) {
  const rows = []
  let row = [], f = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = '' }
    else if (c !== '\r') f += c
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  const [header, ...data] = rows
  return { header, rows: data.filter((r) => r.length >= header.length - 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))) }
}

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
const buf = Buffer.from(await res.arrayBuffer())
const text = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString('utf8') : buf.toString('utf8')
const { header, rows } = parseCsv(text)

const count = (field, top = 40) => {
  const m = {}
  for (const r of rows) m[r[field] || '(vazio)'] = (m[r[field] || '(vazio)'] || 0) + 1
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, top))
}
const filled = Object.fromEntries(header.map((h) => [h, rows.filter((r) => r[h] && r[h] !== '0').length]))
const groups = new Set(rows.map((r) => r.parent_product_id || r.merchant_product_id))
const out = {
  feed: FEED_ID, bytes: buf.length, rows: rows.length, header, filled,
  distinctGroups: groups.size,
  merchant_category: count('merchant_category', 60),
  category_name: count('category_name', 30),
  suitable_for: count('Fashion:suitable_for'),
  in_stock: count('in_stock'),
  brand: count('brand_name', 20),
  size: count('Fashion:size', 60),
  colour: count('colour', 25),
  custom_1: count('custom_1', 15), custom_2: count('custom_2', 15), custom_3: count('custom_3', 15),
  custom_4: count('custom_4', 15), custom_5: count('custom_5', 15), custom_6: count('custom_6', 15),
}
console.log(JSON.stringify(out, null, 1))
// exemplos: 6 linhas espalhadas pelo ficheiro, sem o endereço de afiliado completo
const step = Math.max(1, Math.floor(rows.length / 6))
for (let i = 0; i < rows.length && i < step * 6; i += step) {
  const r = { ...rows[i] }
  for (const k of Object.keys(r)) if (typeof r[k] === 'string') r[k] = r[k].slice(0, 220)
  console.log('EXEMPLO', i, JSON.stringify(r))
}
