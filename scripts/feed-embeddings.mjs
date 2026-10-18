// scripts/feed-embeddings.mjs
//
// Prepara os ténis importados (About You, ...) para a PESQUISA POR FOTO:
// calcula a "impressão" (embedding CLIP) das fotos de cada ténis que ainda
// não a tem e guarda-a na tabela product_image_embeddings - a mesma que o
// botão "Atualizar pesquisa por foto" do admin preenche para os ténis
// escolhidos à mão.
//
// Usa o mesmo modelo e a mesma versão do modelo que o browser usa no site
// (lib/imageEmbedding.ts: Xenova/clip-vit-base-patch32, versão "q8"), para
// as impressões serem diretamente comparáveis com as fotos que os
// visitantes enviam.
//
// Por ténis: a foto principal (tratada) + a foto original da loja. Para não
// passar do tempo do GitHub, pára ao fim de MAX_MINUTES e continua no dia
// seguinte com os que faltarem.
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from '@huggingface/transformers'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MAX_MINUTES = Number(process.env.EMBED_MAX_MINUTES || 45)
const PHOTOS_PER_PRODUCT = 2
const MODEL_NAME = 'Xenova/clip-vit-base-patch32'

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Faltam as chaves do Supabase'); process.exit(1) }
env.allowLocalModels = false

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }
async function sb(path, { method = 'GET', body, prefer, range } = {}) {
  const headers = { ...H }
  if (prefer) headers.Prefer = prefer
  if (range) headers.Range = range
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!r.ok) throw new Error(`Supabase ${method} ${path.split('?')[0]}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`)
  const text = await r.text()
  return text ? JSON.parse(text) : null
}
async function sbAll(path) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const rows = await sb(path, { range: `${from}-${from + 999}` })
    out.push(...rows)
    if (rows.length < 1000) return out
  }
}

const t0 = Date.now()
const report = { mode: 'embeddings', products: 0, photos: 0, failed: 0, remaining: 0, errors: [] }
try {
  const imported = await sbAll('products?source=not.is.null&image_url=like.*product-photos*&select=id,slug,image_url,image_urls&order=created_at.desc')
  const done = new Set((await sbAll('product_image_embeddings?select=product_id,products!inner(source)&products.source=not.is.null&order=id')).map((r) => r.product_id))
  const todo = imported.filter((p) => !done.has(p.id))
  console.log(`Ténis importados com foto: ${imported.length}, já preparados: ${done.size}, por preparar: ${todo.length}`)

  const processor = await AutoProcessor.from_pretrained(MODEL_NAME)
  const visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_NAME, { dtype: 'q8' })

  for (const p of todo) {
    if ((Date.now() - t0) / 60000 > MAX_MINUTES) break
    const urls = [p.image_url, ...(p.image_urls ?? [])].filter((u, i, all) => u && all.indexOf(u) === i).slice(0, PHOTOS_PER_PRODUCT)
    const rows = []
    for (const url of urls) {
      try {
        const source = url.includes('cdn.aboutyou.de') ? url.replace(/width=\d+/, 'width=600').replace(/height=\d+/, 'height=800') : url
        const image = await RawImage.fromURL(source)
        const { image_embeds } = await visionModel(await processor(image))
        rows.push({ product_id: p.id, image_url: url, embedding: Array.from(image_embeds.data) })
      } catch (e) {
        report.failed++
        if (report.errors.length < 20) report.errors.push(`${p.slug}: ${String(e?.message || e).slice(0, 120)}`)
      }
    }
    if (rows.length) {
      await sb('product_image_embeddings?on_conflict=product_id,image_url', { method: 'POST', body: rows, prefer: 'return=minimal,resolution=merge-duplicates' })
      report.products++
      report.photos += rows.length
    }
    if (report.products % 100 === 0 && rows.length) console.log(`${report.products} ténis preparados...`)
  }
  report.remaining = todo.length - report.products
} catch (e) {
  report.errors.push(String(e?.stack || e).slice(0, 2000))
  console.error(e)
}
report.seconds = Math.round((Date.now() - t0) / 1000)
console.log(JSON.stringify(report, null, 1))
try {
  await sb('import_runs', { method: 'POST', body: { source: 'embeddings', mode: 'embeddings', started_at: new Date(t0).toISOString(), finished_at: new Date().toISOString(), report }, prefer: 'return=minimal' })
} catch (e) { console.error('Não consegui guardar o resumo:', e) }
