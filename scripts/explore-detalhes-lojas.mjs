// scripts/explore-detalhes-lojas.mjs
//
// Só leitura: vê que detalhes (material, sola, fecho, ajuste...) os ficheiros
// da 4 Elementos (Awin) e da About You (Tradedoubler) trazem para os ténis, e
// em quantas linhas vêm preenchidos. Escreve um resumo curto no registo da
// execução, sem endereços. Não mexe no site nem na base de dados.
import { streamCsvRows } from './awin-csv.mjs'
import { streamProducts } from './feed-stream.mjs'

const STORE = process.env.STORE
const clean = (v, n = 260) => String(v ?? '').replace(/https?:\/\/\S+/g, '[url]').replace(/\s+/g, ' ').slice(0, n)
const inc = (o, k) => { o[k] = (o[k] || 0) + 1 }

// "Chave: valor; Chave: valor" -> chaves e valores
function pairs(text) {
  const out = []
  for (const part of String(text || '').split(/;\s*/)) {
    const i = part.indexOf(':')
    if (i > 0 && i < 40) out.push([part.slice(0, i).trim(), part.slice(i + 1).trim()])
  }
  return out
}

if (STORE === '4elementos') {
  const KEY = process.env.AWIN_API_KEY
  const FEED_ID = process.env.AWIN_FEED_ID || '114316'
  const COLUMNS = ['merchant_product_id', 'product_name', 'merchant_category', 'colour', 'description', 'product_short_description',
    'specifications', 'keywords', 'Fashion:category', 'Fashion:material', 'Fashion:pattern', 'Fashion:suitable_for', 'dimensions',
    'custom_1', 'custom_2', 'custom_3', 'custom_4', 'custom_5', 'custom_6', 'model_number', 'mpn', 'product_GTIN']
  const url = `https://productdata.awin.com/datafeed/download/apikey/${KEY}/fid/${FEED_ID}/format/csv/language/pt/delimiter/%2C/compression/gzip/columns/${encodeURIComponent(COLUMNS.join(','))}/`
  let res
  for (let a = 1; a <= 3; a++) { res = await fetch(url); if (res.ok) break; console.log('Tentativa', a, res.status); await new Promise((r) => setTimeout(r, 30000)) }
  if (!res.ok) { console.error('Sem ficheiro'); process.exit(1) }
  const SNEAKER = /^(Ténis|Sapatilhas|Zapatillas|Sapatos)$/i
  const filled = {}, cats = {}, keys = {}
  const samples = []
  let n = 0
  for await (const r of streamCsvRows(res)) {
    inc(cats, r.merchant_category)
    if (!SNEAKER.test((r.merchant_category || '').trim())) continue
    n++
    for (const h of Object.keys(r)) if (r[h] && r[h] !== '0') inc(filled, h)
    for (const f of ['description', 'specifications', 'product_short_description']) for (const [k] of pairs(r[f])) inc(keys, f + '|' + k)
    if (samples.length < 4 && n % 90 === 1) samples.push(r)
  }
  console.log('CATEGORIAS', JSON.stringify(Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 12)))
  console.log('LINHAS DE TENIS', n)
  console.log('PREENCHIDOS', JSON.stringify(filled))
  console.log('CHAVES', JSON.stringify(Object.entries(keys).sort((a, b) => b[1] - a[1]).slice(0, 25)))
  for (const s of samples) {
    console.log('--- EXEMPLO ' + clean(s.product_name, 70))
    for (const h of Object.keys(s)) if (s[h] && !['merchant_product_id', 'product_name'].includes(h)) console.log('  ' + h + ' = ' + clean(s[h]))
  }
} else if (STORE === 'aboutyou') {
  const TOKEN = process.env.TRADEDOUBLER_TOKEN
  const FEED_ID = process.env.TD_FEED_ID || '119264'
  const url = `https://api.tradedoubler.com/1.0/productsUnlimited.json;fid=${FEED_ID}?token=${TOKEN}`
  let res
  for (let a = 1; a <= 30; a++) {
    res = await fetch(url)
    if (res.status === 200) break
    console.log('Tentativa', a, res.status)
    if (res.status !== 202) { console.error('Erro'); process.exit(1) }
    await new Promise((r) => setTimeout(r, 60000))
  }
  const field = (p, name) => (p.fields || []).find((f) => f.name === name)?.value
  const keys = {}, vals = {}
  let n = 0, withTech = 0, withDesc = 0, withMat = 0
  const samples = []
  const brandsSeen = new Set()
  for await (const raw of streamProducts(res)) {
    if (!raw.includes('Sapatilhas')) continue
    let p
    try { p = JSON.parse(raw) } catch { continue }
    if (field(p, '3rd_category') !== 'Sapatilhas') continue
    n++
    if (p.techSpecs) withTech++
    if (p.description) withDesc++
    if (field(p, 'material')) withMat++
    for (const [k, v] of pairs(p.techSpecs || p.description)) {
      inc(keys, k)
      vals[k] = vals[k] || {}
      inc(vals[k], v.slice(0, 50))
    }
    if (samples.length < 6 && !brandsSeen.has(p.brand) && Math.random() < 0.05) { brandsSeen.add(p.brand); samples.push(p) }
  }
  console.log('SAPATILHAS', n, 'com techSpecs', withTech, 'com description', withDesc, 'com material', withMat)
  const top = Object.entries(keys).sort((a, b) => b[1] - a[1]).slice(0, 30)
  console.log('CHAVES', JSON.stringify(top))
  for (const [k] of top.slice(0, 14)) console.log('  VALORES ' + k + ' = ' + JSON.stringify(Object.entries(vals[k]).sort((a, b) => b[1] - a[1]).slice(0, 6)))
  for (const p of samples) {
    console.log('--- EXEMPLO ' + clean(p.brand, 30) + ' | ' + clean(p.name, 70))
    console.log('  techSpecs = ' + clean(p.techSpecs, 500))
    console.log('  material = ' + clean(field(p, 'material'), 100))
  }
} else { console.error('STORE em falta'); process.exit(1) }
