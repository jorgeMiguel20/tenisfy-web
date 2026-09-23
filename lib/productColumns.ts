// lib/productColumns.ts
// Colunas da tabela "products" que o site usa - todas MENOS "embedding".
//
// Porquê: "select('*')" trazia também o "embedding" de cada ténis (o vetor
// de 512 números usado só pela pesquisa por foto, que é feita na base de
// dados - ver app/api/search-by-image/route.ts). Esse vetor ia parar ao
// browser em todas as páginas que passam produtos a componentes do lado do
// cliente (/comparar, /catalogo, homepage, favoritos): ~6 KB por ténis que
// ninguém vê, só a atrasar o carregamento (medido ao vivo: 57 KB por página
// no /comparar e no /catalogo com 11 produtos - cresce com o catálogo).
//
// Se um dia se acrescentar uma coluna nova à tabela "products" e ela tiver
// de aparecer no site, é preciso acrescentá-la também aqui.
export const PRODUCT_COLUMNS =
  'id, brand_id, model_name, slug, category, gender, description, image_url, image_urls, is_active, created_at, updated_at, color, material, sole_type, closure_type, fit, article_code, weight, drop_height, sustainability, base_colors, color_variant_group'

// Junta as colunas acima às relações de cada consulta (ex.: "brands (*),
// product_offers (...)").
// O tipo devolvido é "*" de propósito: o texto real enviado à base de dados
// é a lista de colunas acima, mas para o TypeScript fica igual a quando se
// usava "*" - assim os tipos dos resultados não mudam em nenhum sítio do
// código (o cliente Supabase deste projeto não tem tipos gerados da base de
// dados, por isso com "*" os resultados já eram "any").
export function productSelect(relations: string): '*' {
  return `${PRODUCT_COLUMNS}, ${relations}` as '*'
}
