'use client'

import type {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
} from '@huggingface/transformers'

// Calcula o embedding CLIP de uma foto diretamente no browser do utilizador,
// evitando correr o modelo no processo Node.js do servidor (onde o binário
// nativo onnxruntime-node crasha em alguns ambientes Windows).
//
// As "impressões" das fotos do catálogo (tabela product_image_embeddings)
// são calculadas com ESTE mesmo código, no admin (/admin/pesquisa-foto),
// para serem diretamente comparáveis com as fotos que os visitantes enviam.
const MODEL_NAME = 'Xenova/clip-vit-base-patch32'

type Processor = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>
type VisionModel = Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>>
type Tokenizer = Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>
type TextModel = Awaited<ReturnType<typeof CLIPTextModelWithProjection.from_pretrained>>

let modelPromise: Promise<{ processor: Processor; visionModel: VisionModel }> | null = null
let textModelPromise: Promise<{ tokenizer: Tokenizer; textModel: TextModel }> | null = null

async function loadTransformers() {
  const transformers = await import('@huggingface/transformers')
  transformers.env.allowLocalModels = false
  if (transformers.env.backends.onnx.wasm) {
    transformers.env.backends.onnx.wasm.numThreads = 1
  }
  return transformers
}

async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const { AutoProcessor, CLIPVisionModelWithProjection } = await loadTransformers()
      const processor = await AutoProcessor.from_pretrained(MODEL_NAME)
      const visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_NAME)
      return { processor, visionModel }
    })()
  }
  return modelPromise
}

// Modelo de TEXTO (só usado no admin, para o "porteiro" da pesquisa por
// foto - ver app/admin/pesquisa-foto). Os visitantes nunca o descarregam.
async function loadTextModel() {
  if (!textModelPromise) {
    textModelPromise = (async () => {
      const { AutoTokenizer, CLIPTextModelWithProjection } = await loadTransformers()
      const tokenizer = await AutoTokenizer.from_pretrained(MODEL_NAME)
      const textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL_NAME)
      return { tokenizer, textModel }
    })()
  }
  return textModelPromise
}

export async function getImageEmbedding(file: File): Promise<number[]> {
  const { RawImage } = await loadTransformers()
  const { processor, visionModel } = await loadModel()
  const image = await RawImage.fromBlob(file)
  const { image_embeds } = await visionModel(await processor(image))
  return Array.from(image_embeds.data as Float32Array)
}

// Para o admin: calcula a impressão de uma foto do próprio site
// (ex.: "/products/adidas-samba-2.webp").
export async function getImageEmbeddingFromUrl(url: string): Promise<number[]> {
  const { RawImage } = await loadTransformers()
  const { processor, visionModel } = await loadModel()
  const image = await RawImage.fromURL(url)
  const { image_embeds } = await visionModel(await processor(image))
  return Array.from(image_embeds.data as Float32Array)
}

// Para o admin: impressões de frases de texto (uma por frase).
export async function getTextEmbeddings(texts: string[]): Promise<number[][]> {
  const { tokenizer, textModel } = await loadTextModel()
  const inputs = tokenizer(texts, { padding: true, truncation: true })
  const { text_embeds } = await textModel(inputs)
  const dimensions = text_embeds.dims[text_embeds.dims.length - 1]
  const data = text_embeds.data as Float32Array
  return texts.map((_, index) => Array.from(data.slice(index * dimensions, (index + 1) * dimensions)))
}
