// script/generate-embeddings.ts
import { createClient } from '@supabase/supabase-js'
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from '@xenova/transformers'

// Força o backend WASM (JavaScript puro), evita binários nativos do ONNX
env.backends.onnx.executionProviders = ['wasm']
env.backends.onnx.wasm.numThreads = 1
env.allowLocalModels = false

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

const MODEL_NAME = 'Xenova/clip-vit-base-patch32'

async function getImageEmbedding(
  processor: any,
  visionModel: any,
  imageUrl: string
): Promise<number[]> {
  const image = await RawImage.read(imageUrl)
  const imageInputs = await processor(image)
  const { image_embeds } = await visionModel(imageInputs)
  return Array.from(image_embeds.data as Float32Array)
}

async function main() {
  console.log('A carregar o modelo CLIP (pode demorar na primeira vez)...')
  const processor = await AutoProcessor.from_pretrained(MODEL_NAME)
  const visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_NAME)
  console.log('Modelo carregado.\n')

  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, image_url')
    .not('image_url', 'is', null)

  if (error) {
    console.error('Erro ao buscar produtos:', error)
    return
  }

  for (const product of products ?? []) {
    console.log(`A processar: ${product.slug}...`)

    try {
      const imageUrl = product.image_url!.startsWith('http')
        ? product.image_url!
        : `${process.env.NEXT_PUBLIC_SITE_URL}${product.image_url}`

      const embedding = await getImageEmbedding(processor, visionModel, imageUrl)

      const { error: updateError } = await supabase
        .from('products')
        .update({ embedding })
        .eq('id', product.id)

      if (updateError) {
        console.error(`Erro ao guardar ${product.slug}:`, updateError)
      } else {
        console.log(`✓ ${product.slug} concluído (${embedding.length} dimensões)`)
      }
    } catch (err) {
      console.error(`Falhou ${product.slug}:`, err)
    }
  }

  console.log('\nConcluído.')
}

main()