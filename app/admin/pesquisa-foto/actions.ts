// app/admin/pesquisa-foto/actions.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { isAdminRequest, NOT_AUTHORIZED_ERROR } from '@/lib/adminAuth'
import { PHOTO_SEARCH_PROMPTS } from '@/lib/photoSearchPrompts'

type ActionResult = { success: true; count: number } | { success: false; error: string }

type ImageEmbeddingInput = { imageUrl: string; embedding: number[] }
type PromptEmbeddingInput = { label: string; embedding: number[] }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMBEDDING_DIMENSIONS = 512
const MAX_IMAGES_PER_PRODUCT = 40

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isValidEmbedding(embedding: unknown): embedding is number[] {
  return (
    Array.isArray(embedding) &&
    embedding.length === EMBEDDING_DIMENSIONS &&
    embedding.every((value) => typeof value === 'number' && Number.isFinite(value))
  )
}

// Guarda as impressões de TODAS as fotos de um ténis (substitui as antigas
// desse ténis). Chamado pelo botão "Atualizar pesquisa por foto".
export async function saveProductImageEmbeddings(
  productId: string,
  items: ImageEmbeddingInput[]
): Promise<ActionResult> {
  if (!(await isAdminRequest())) return { success: false, error: NOT_AUTHORIZED_ERROR }

  if (typeof productId !== 'string' || !UUID_REGEX.test(productId)) {
    return { success: false, error: 'Produto inválido.' }
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_IMAGES_PER_PRODUCT) {
    return { success: false, error: 'Lista de fotos inválida.' }
  }
  for (const item of items) {
    if (typeof item?.imageUrl !== 'string' || item.imageUrl.length > 500 || !isValidEmbedding(item.embedding)) {
      return { success: false, error: 'Foto inválida na lista.' }
    }
  }

  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: 'Configuração do Supabase em falta no servidor.' }

  const { error: deleteError } = await supabase
    .from('product_image_embeddings')
    .delete()
    .eq('product_id', productId)
  if (deleteError) return { success: false, error: 'Não foi possível apagar as impressões antigas.' }

  const uniqueItems = Array.from(new Map(items.map((item) => [item.imageUrl, item])).values())
  const { error: insertError } = await supabase.from('product_image_embeddings').insert(
    uniqueItems.map((item) => ({
      product_id: productId,
      image_url: item.imageUrl,
      embedding: item.embedding,
    }))
  )
  if (insertError) return { success: false, error: 'Não foi possível guardar as impressões.' }

  return { success: true, count: uniqueItems.length }
}

// Guarda as impressões das frases do "porteiro" (lib/photoSearchPrompts.ts).
export async function savePromptEmbeddings(items: PromptEmbeddingInput[]): Promise<ActionResult> {
  if (!(await isAdminRequest())) return { success: false, error: NOT_AUTHORIZED_ERROR }

  if (!Array.isArray(items) || items.length !== PHOTO_SEARCH_PROMPTS.length) {
    return { success: false, error: 'Lista de frases inválida.' }
  }

  const rows = []
  for (const item of items) {
    const prompt = PHOTO_SEARCH_PROMPTS.find((p) => p.label === item?.label)
    if (!prompt || !isValidEmbedding(item.embedding)) {
      return { success: false, error: 'Frase inválida na lista.' }
    }
    rows.push({
      label: prompt.label,
      is_sneaker: prompt.isSneaker,
      embedding: item.embedding,
      updated_at: new Date().toISOString(),
    })
  }

  const supabase = getServiceClient()
  if (!supabase) return { success: false, error: 'Configuração do Supabase em falta no servidor.' }

  // Frases que já não estão na lista deixam de contar.
  const { error: deleteError } = await supabase
    .from('photo_search_prompts')
    .delete()
    .not('label', 'in', `(${PHOTO_SEARCH_PROMPTS.map((p) => `"${p.label}"`).join(',')})`)
  if (deleteError) return { success: false, error: 'Não foi possível limpar as frases antigas.' }

  const { error } = await supabase.from('photo_search_prompts').upsert(rows, { onConflict: 'label' })
  if (error) return { success: false, error: 'Não foi possível guardar as frases.' }

  revalidatePath('/admin/pesquisa-foto')
  return { success: true, count: rows.length }
}
