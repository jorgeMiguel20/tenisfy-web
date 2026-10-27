// scripts/explore-awin-detalhes.mjs
//
// Terceira leitura do ficheiro da Awin, só para o calçado: descobre que
// campos de DETALHES (descrição, material, etc.) o ficheiro da loja traz e em
// quantas linhas vêm preenchidos, e mostra exemplos curtos sem endereços.
// Não mexe em nada no site nem na base de dados.
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
const samples = []
const seenArt = new Set()
let header = null
let shoes = 0
for await (const r of streamCsvRows(res)) {
  if (!header) { header = Object.keys(r); console.log('COLUNAS NO FICHEIRO', header.join(' | ')) }
  if (!/^Calcado/i.test(r.merchant_category || '')) continue
  shoes++
  for (const h of header) if (r[h] && r[h] !== '0') filled[h] = (filled[h] || 0) + 1
  const art = String(r.merchant_product_id || '').split('-')[0]
  if (!seenArt.has(art) && samples.length < 6 && shoes % 400 === 1) { seenArt.add(art); samples.push(r) }
}
console.log('LINHAS DE CALCADO', shoes)
console.log('PREENCHIDOS', JSON.stringify(filled))
for (const s of samples) {
  console.log('--- EXEMPLO ' + clean(s.product_name, 60) + ' | ' + clean(s.merchant_category, 60))
  for (const h of header) if (s[h] && !['merchant_product_id', 'product_name'].includes(h)) console.log('  ' + h + ' = ' + clean(s[h]))
}
