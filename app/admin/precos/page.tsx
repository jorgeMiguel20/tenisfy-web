// app/admin/precos/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import PriceCheckButton from './PriceCheckButton'
import ProposalsSection, { type ProposalRow } from './ProposalsSection'
import AttentionSection, { type AttentionRow } from './AttentionSection'
import NewSizesSection, { type NewSizeRow } from './NewSizesSection'

// Ferramenta operacional (revista todos os dias) - tem de mostrar sempre as
// propostas mais recentes, nunca uma versão em cache de quando o site foi
// gerado.
export const dynamic = 'force-dynamic'

// noindex: página interna, não deve ser indexada nem aparecer em resultados
// de pesquisa mesmo que alguém a ligue por engano nalgum lado.
export const metadata: Metadata = {
  title: 'Verificar preços | Parjusto',
  robots: { index: false, follow: false },
}

async function getProposals() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return { proposals: [] as ProposalRow[], attention: [] as AttentionRow[] }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('price_check_proposals')
    .select(`
      id, product_offer_id, checked_price, checked_available, previous_price, previous_in_stock, notes, needs_attention, first_flagged_at,
      product_offers (
        size, affiliate_url,
        products (model_name, brands (name)),
        stores (name)
      )
    `)
    .eq('status', 'pending')
    .order('checked_at', { ascending: false })

  if (error || !data) return { proposals: [] as ProposalRow[], attention: [] as AttentionRow[] }

  const proposals: ProposalRow[] = []
  const attention: AttentionRow[] = []

  for (const row of data as any[]) {
    const offer = row.product_offers
    const productName = `${offer?.products?.brands?.name ?? ''} ${offer?.products?.model_name ?? ''}`.trim()
    const storeName = offer?.stores?.name ?? 'Loja'

    if (row.needs_attention) {
      attention.push({
        id: row.id,
        productOfferId: row.product_offer_id,
        productName,
        storeName,
        size: offer?.size ?? '',
        url: offer?.affiliate_url ?? '#',
        notes: row.notes,
        firstFlaggedAt: row.first_flagged_at,
      })
    } else {
      proposals.push({
        id: row.id,
        productName,
        storeName,
        size: offer?.size ?? '',
        previousPrice: row.previous_price,
        checkedPrice: row.checked_price,
        previousInStock: row.previous_in_stock,
        checkedAvailable: row.checked_available,
      })
    }
  }

  // Item 4 do pedido do Jorge: maior variação de preço primeiro (valor
  // absoluto entre previous_price e checked_price). Propostas sem preço
  // lido (checked_price null, só a confirmar disponibilidade) ficam no fim,
  // já que não há variação nenhuma para ordenar.
  proposals.sort((a, b) => {
    const diffA = a.checkedPrice == null ? -1 : Math.abs(a.checkedPrice - a.previousPrice)
    const diffB = b.checkedPrice == null ? -1 : Math.abs(b.checkedPrice - b.previousPrice)
    return diffB - diffA
  })

  return { proposals, attention }
}

async function getNewSizes(): Promise<NewSizeRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return []

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('size_discovery_proposals')
    .select(`
      id, size, price, in_stock, url,
      products (model_name, brands (name)),
      stores (name)
    `)
    .eq('status', 'pending')
    .order('first_seen_at', { ascending: false })

  if (error || !data) return []

  return (data as any[]).map((row) => ({
    id: row.id,
    productName: `${row.products?.brands?.name ?? ''} ${row.products?.model_name ?? ''}`.trim(),
    storeName: row.stores?.name ?? 'Loja',
    size: row.size,
    price: row.price,
    inStock: row.in_stock,
    url: row.url,
  }))
}

export default async function AdminPrecosPage() {
  const { proposals, attention } = await getProposals()
  const newSizes = await getNewSizes()

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificar preços</h1>
        <p className="text-gray-500 mb-8">
          Clica depois de confirmares os preços em todas as lojas. Isto atualiza a data
          mostrada em cada página de produto.
        </p>
        <PriceCheckButton />
      </div>

      <ProposalsSection proposals={proposals} />
      <NewSizesSection sizes={newSizes} />
      <AttentionSection proposals={attention} />
    </main>
  )
}

