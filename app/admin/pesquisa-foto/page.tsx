// app/admin/pesquisa-foto/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import PhotoSearchIndexer, { type IndexerProduct } from './PhotoSearchIndexer'

// Página interna (protegida pela palavra-passe do admin, ver proxy.ts):
// prepara a pesquisa por foto - calcula a "impressão" de cada foto de cada
// ténis do catálogo. Carregar no botão sempre que se juntam ténis ou fotos
// novas.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pesquisa por foto | Parjusto',
  robots: { index: false, follow: false },
}

type ProductRow = {
  id: string
  slug: string
  model_name: string
  image_url: string | null
  image_urls: string[] | null
  is_active: boolean | null
  brands: { name: string } | null
}

async function getData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return { products: [] as IndexerProduct[], promptCount: 0, error: true }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const [{ data: products, error }, { data: indexed }, { count: promptCount }] = await Promise.all([
    supabase
      .from('products')
      .select('id, slug, model_name, image_url, image_urls, is_active, brands (name)')
      .order('model_name'),
    supabase.from('product_image_embeddings').select('product_id'),
    supabase.from('photo_search_prompts').select('label', { count: 'exact', head: true }),
  ])

  const indexedCount = new Map<string, number>()
  for (const row of indexed ?? []) {
    indexedCount.set(row.product_id, (indexedCount.get(row.product_id) ?? 0) + 1)
  }

  const rows = (products ?? []) as unknown as ProductRow[]
  const list: IndexerProduct[] = rows
    .filter((p) => p.is_active !== false)
    .map((p) => {
      const imageUrls = Array.from(
        new Set([p.image_url, ...(p.image_urls ?? [])].filter((url): url is string => Boolean(url)))
      )
      return {
        id: p.id,
        name: `${p.brands?.name ?? ''} ${p.model_name}`.trim(),
        imageUrls,
        indexedCount: indexedCount.get(p.id) ?? 0,
      }
    })

  return { products: list, promptCount: promptCount ?? 0, error: Boolean(error) }
}

export default async function PesquisaFotoAdminPage() {
  const { products, promptCount, error } = await getData()

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Pesquisa por foto</h1>
      <p className="text-gray-500 mb-8">
        Prepara a pesquisa por foto com todas as fotos de cada ténis. Carrega no botão sempre que
        juntares ténis ou fotos novas ao catálogo. Demora alguns minutos - deixa esta página aberta até
        terminar.
      </p>
      {error ? (
        <p className="text-red-600">Não foi possível ler o catálogo. Tenta de novo mais tarde.</p>
      ) : (
        <PhotoSearchIndexer products={products} promptCount={promptCount} />
      )}
    </main>
  )
}
