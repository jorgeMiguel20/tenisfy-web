'use client'

import type { AutoProcessor, CLIPVisionModelWithProjection } from '@huggingface/transformers'

// Calcula o embedding CLIP de uma foto diretamente no browser do utilizador,
// evitando correr o modelo no processo Node.js do servidor (onde o binário
// nativo onnxruntime-node crasha em alguns ambientes Windows).
//
// Usa o mesmo modelo que script/generate-embeddings.ts para que os vetores
// gerados aqui sejam comparáveis com os já guardados no Supabase.
const MODEL_NAME = 'Xenova/clip-vit-base-patch32'

type Processor = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>
type VisionModel = Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>>

let modelPromise: Promise<{ processor: Processor; visionModel: VisionModel }> | null = null

async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const { AutoProcessor, CLIPVisionModelWithProjection, env } = await import(
        '@huggingface/transformers'
      )

      env.allowLocalModels = false
      if (env.backends.onnx.wasm) {
        env.backends.onnx.wasm.numThreads = 1
      }

      const processor = await AutoProcessor.from_pretrained(MODEL_NAME)
      const visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_NAME)

      return { processor, visionModel }
    })()
  }

  return modelPromise
}

export async function getImageEmbedding(file: File): Promise<number[]> {
  const { RawImage } = await import('@huggingface/transformers')
  const { processor, visionModel } = await loadModel()

  const image = await RawImage.fromBlob(file)
  const imageInputs = await processor(image)
  const { image_embeds } = await visionModel(imageInputs)

  return Array.from(image_embeds.data as Float32Array)
}
