// app/admin/pesquisa-foto/PhotoSearchIndexer.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getImageEmbeddingFromUrl, getTextEmbeddings } from '@/lib/imageEmbedding'
import { PHOTO_SEARCH_PROMPTS } from '@/lib/photoSearchPrompts'
import { saveProductImageEmbeddings, savePromptEmbeddings } from './actions'

export type IndexerProduct = {
  id: string
  name: string
  imageUrls: string[]
  indexedCount: number
}

const BUTTON_CLASS =
  'inline-flex min-h-[44px] items-center justify-center rounded-none bg-[#123F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f2b] disabled:opacity-60'

export default function PhotoSearchIndexer({
  products,
  promptCount,
}: {
  products: IndexerProduct[]
  promptCount: number
}) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [finished, setFinished] = useState(false)

  const totalPhotos = products.reduce((sum, p) => sum + p.imageUrls.length, 0)

  async function handleRun() {
    setRunning(true)
    setFinished(false)
    setProblems([])
    const found: string[] = []
    let done = 0

    try {
      setProgress('A carregar o modelo (só demora da primeira vez)...')

      for (const product of products) {
        const items: { imageUrl: string; embedding: number[] }[] = []
        for (const imageUrl of product.imageUrls) {
          setProgress(`A analisar fotos: ${done + 1} de ${totalPhotos} (${product.name})`)
          try {
            items.push({ imageUrl, embedding: await getImageEmbeddingFromUrl(imageUrl) })
          } catch {
            found.push(`${product.name}: não foi possível ler a foto ${imageUrl}`)
          }
          done++
        }

        if (items.length > 0) {
          const result = await saveProductImageEmbeddings(product.id, items)
          if (!result.success) found.push(`${product.name}: ${result.error}`)
        }
      }

      setProgress('A preparar o "porteiro" (distinguir ténis de outras coisas)...')
      const labels = PHOTO_SEARCH_PROMPTS.map((p) => p.label)
      const embeddings = await getTextEmbeddings(labels)
      const promptResult = await savePromptEmbeddings(
        labels.map((label, index) => ({ label, embedding: embeddings[index] }))
      )
      if (!promptResult.success) found.push(`Porteiro: ${promptResult.error}`)

      setProgress(null)
      setFinished(true)
    } catch {
      found.push('Algo correu mal a meio. Atualiza a página e tenta de novo.')
      setProgress(null)
    } finally {
      setProblems(found)
      setRunning(false)
      router.refresh()
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button type="button" onClick={handleRun} disabled={running || products.length === 0} className={BUTTON_CLASS}>
          {running ? 'A atualizar...' : 'Atualizar pesquisa por foto'}
        </button>
        <span className="text-sm text-gray-500">
          {products.length} ténis · {totalPhotos} fotos · porteiro {promptCount > 0 ? 'pronto' : 'por preparar'}
        </span>
      </div>

      {progress && <p className="mb-4 text-sm text-gray-700">{progress}</p>}
      {finished && problems.length === 0 && (
        <p className="mb-4 text-sm font-medium text-green-700">Pronto! A pesquisa por foto já usa todas as fotos.</p>
      )}
      {problems.length > 0 && (
        <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium mb-1">Terminou com {problems.length} problema(s):</p>
          <ul className="list-disc pl-5">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2 font-medium">Ténis</th>
            <th className="py-2 font-medium text-right">Fotos</th>
            <th className="py-2 font-medium text-right">Preparadas</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-gray-100">
              <td className="py-2 text-gray-900">{product.name}</td>
              <td className="py-2 text-right text-gray-700">{product.imageUrls.length}</td>
              <td
                className={`py-2 text-right ${
                  product.indexedCount >= product.imageUrls.length ? 'text-green-700' : 'text-amber-700'
                }`}
              >
                {product.indexedCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
