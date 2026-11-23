// app/api/catalogo-grelha/[part]/route.ts
//
// A lista completa do catálogo (os dados que a grelha, os filtros e os cartões
// usam), em JSON, dividida em pacotes: /api/catalogo-grelha/1, /2, ... /6.
// Cada pacote tem até 3 500 ténis pela ordem "Relevância"; pacotes para lá do
// fim do catálogo devolvem uma lista vazia.
//
// Porquê pacotes: com mais de 13 000 ténis, um único ficheiro de ~15 MB deixou
// de ser guardado pelo Vercel (o site ficava preso numa cópia antiga, sem os
// ténis novos). Cada pacote pesa ~4 MB.
//
// Fica em cache 1 hora, como a própria página do catálogo (ver
// "moreUrl" em components/ProductGrid.tsx).
import { getCatalogGridPart, CATALOG_GRID_MAX_PARTS } from '@/lib/catalogGridList'

export const dynamic = 'force-static'
export const revalidate = 3600

// Nenhum pacote é gerado na compilação do site; o primeiro pedido gera-o e fica
// guardado (assim a compilação não depende da base de dados).
export function generateStaticParams() {
  return []
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ part: string }> }
) {
  const { part } = await context.params
  const n = Number(part)
  if (!Number.isInteger(n) || n < 1 || n > CATALOG_GRID_MAX_PARTS) {
    return Response.json([], { status: 404 })
  }
  const list = await getCatalogGridPart(n)
  return Response.json(list)
}
