// scripts/refresh-catalog.mjs
//
// Prepara o "resumo do catálogo" (tabela catalog_grid_cache): uma linha por
// ténis visível, com os dados da grelha já calculados e a ordem "Relevância".
// Usa EXATAMENTE o mesmo código do site (lib/getProductsWithPrice.ts,
// lib/slimForGrid.ts, lib/relevanceOrder.ts), por isso o resultado é igual ao
// que o catálogo calculava sozinho - só que agora é calculado aqui, uma vez,
// e o site limita-se a ler.
//
// Corre no GitHub Actions (workflow "Atualizar resumo do catálogo") com a
// chave de serviço, que não tem o limite de 3 segundos da chave pública. As
// duas variáveis NEXT_PUBLIC_* são preenchidas pelo workflow para o código do
// site ler com essa chave. Nada é escrito no registo além de contagens.
import { createClient } from '@supabase/supabase-js'
import { getProductsWithPrice } from '../lib/getProductsWithPrice.ts'
import { slimForGrid } from '../lib/slimForGrid.ts'
import { relevanceOrder } from '../lib/relevanceOrder.ts'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const t0 = Date.now()
const { products, error } = await getProductsWithPrice()
if (error) { console.error('Erro ao ler o catálogo: ' + error); process.exit(1) }
console.log(`Ténis lidos: ${products.length} (${Math.round((Date.now() - t0) / 1000)} s)`)

// Proteção: nunca trocar um resumo bom por um quase vazio (ex.: se a leitura
// falhasse a meio sem dar erro).
const { count: before } = await admin.from('catalog_grid_cache').select('product_id', { count: 'exact', head: true })
if (products.length < 100 || (before > 500 && products.length < before * 0.6)) {
  console.error(`Resumo recusado: ${products.length} ténis lidos, mas o resumo atual tem ${before}.`)
  process.exit(1)
}

const stamp = new Date().toISOString()
const rows = relevanceOrder(products).map((p, i) => ({
  product_id: p.id,
  brand_id: p.brand_id,
  sort_rank: i,
  is_curated: !p.source,
  slim: slimForGrid(p),
  refreshed_at: stamp,
}))

const BATCH = 100
for (let i = 0; i < rows.length; i += BATCH) {
  const part = rows.slice(i, i + BATCH)
  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error: upsertError } = await admin.from('catalog_grid_cache').upsert(part, { onConflict: 'product_id' })
    lastError = upsertError
    if (!upsertError) break
    await new Promise((r) => setTimeout(r, 2000 * attempt))
  }
  if (lastError) { console.error('Erro ao gravar o resumo: ' + lastError.message); process.exit(1) }
}

// Ténis que já não estão visíveis: saem do resumo.
const { error: deleteError, count: removed } = await admin.from('catalog_grid_cache').delete({ count: 'exact' }).lt('refreshed_at', stamp)
if (deleteError) { console.error('Erro ao limpar o resumo: ' + deleteError.message); process.exit(1) }

console.log(JSON.stringify({ gravados: rows.length, removidos: removed ?? 0, antes: before ?? 0, segundos: Math.round((Date.now() - t0) / 1000) }))
