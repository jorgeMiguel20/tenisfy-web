// scripts/explore-awin-detalhes.mjs
//
// Leitura do ficheiro da Awin para descobrir que campos de DETALHES
// (descrição, material, etc.) o ficheiro da loja traz e em quantas linhas
// vêm preenchidos. Esta versão não filtra por categoria: mostra as categorias
// mais comuns e analisa todas as linhas. Não mexe em nada no site nem na base de dados.
import { streamCsvRows } from './awin-csv.mjs'

const KEY = process.env.AWIN_API_KEY
const FEED_ID = process.env.AWIN_FEED_ID
if (!KEY || !FEED_ID) { console.error('Falta AWIN_API_KEY ou AWIN_FEED_ID'); process.exit(1) }

const COLUMNS = [
'merchant_product_id', 'product_name', 'merchant_category', 'colour', 'description', 'product_short_description',
'specifications', 'keywords', 'product_type', 'Fashion:category', 'Fashion:material', 'Fashion:pattern',
'Fashion:swatch', 'Fashion:size', 'Fashion:suitable_for', 'condition', 'language', 'dimensions', 'weight',
'custom_1', 'custom_2', 'custom_3', 'custom_4', 'custom_5', 'custom_6', 'base_price_text', 'commission_group',
'merchant_product_category_path', 'product_GTIN', 'model_number', 'mpn',
]
const url = `https://productdata.awin.com/datafeed/download/apikey/${KEY}/fid/${FEED_ID}/format/csv/language/pt/delimiter/%2C/compression/gzip/columns/${encodeURIComponent(COLUMNS.join(','))}/`
let res
for (let a = 1; a <= 3; a++) { res = await fetch(url); if (res.ok) break; console.log(`Tentativa ${a}: HTTP ${res.status}`); await new Promise((r) => setTimeout(r, 30_000)) }
if (!res.ok) { console.error('Não consegui descarregar o ficheiro'); process.exit(1) }

const clean = (v, n = 220) => String(v ?? '').replace(/https?:\/\/\S+/g, '[url]').replace(/\s+/g, ' ').slice(0, n)
const filled = {}
const cats = {}
const samples = []
const seenCat = new Set()
let header = null
let total = 0
for await (const r of streamCsvRows(res)) {
if (!header) { header = Object.keys(r); console.log('COLUNAS NO FICHEIRO', header.join(' | ')) }
total++
const cat = clean(r.merchant_category || r['Fashion:category'] || r.product_type || '(sem categoria)', 50)
cats[cat] = (cats[cat] || 0) + 1
for (const h of header) if (r[h] && r[h] !== '0') filled[h] = (filled[h] || 0) + 1
if (!seenCat.has(cat) && samples.length < 8 && (r.description || r.specifications || r['Fashion:material'])) { seenCat.add(cat); samples.push(r) }
}
console.log('LINHAS NO TOTAL', total)
console.log('PREENCHIDOS', JSON.stringify(filled))
console.log('CATEGORIAS MAIS COMUNS', JSON.stringify(Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 25)))
for (const s of samples) {
console.log('--- EXEMPLO ' + clean(s.product_name, 60) + ' | ' + clean(s.merchant_category, 60))
for (const h of header) if (s[h] && !['merchant_product_id', 'product_name'].includes(h)) console.log(' ' + h + ' = ' + clean(s[h]))
}
