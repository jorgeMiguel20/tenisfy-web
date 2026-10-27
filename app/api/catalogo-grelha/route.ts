// app/api/catalogo-grelha/route.ts
//
// O catálogo completo (os dados que a grelha, os filtros e os cartões usam),
// em JSON. A página /catalogo só traz os primeiros ténis no HTML, para abrir
// logo; o resto chega daqui, em segundo plano (ver "moreUrl" em
// components/ProductGrid.tsx).
//
// Fica em cache 1 hora, como a própria página do catálogo, e é lido do
// "resumo do catálogo" (com plano B, ver lib/catalogGridList.ts).
import { getCatalogGridList } from '@/lib/catalogGridList'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  const list = await getCatalogGridList()
  return Response.json(list)
}
