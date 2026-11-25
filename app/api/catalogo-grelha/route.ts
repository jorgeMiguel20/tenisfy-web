// app/api/catalogo-grelha/route.ts
//
// Endereço antigo da lista completa do catálogo (um único ficheiro de ~15 MB).
// Foi substituído pelos pacotes /api/catalogo-grelha/1 ... /6 (ver
// app/api/catalogo-grelha/[part]/route.ts). Este endereço já não lê nada da
// base de dados: encaminha para o 1.º pacote.
//
// Porque é dinâmico e não estático: sendo estático, a compilação do site lia o
// catálogo inteiro da base de dados e, com a base de dados ocupada, falhava com
// "statement timeout" - o que já impediu versões do site de ir para o ar.
export const dynamic = 'force-dynamic'

export async function GET() {
  return new Response(null, { status: 308, headers: { Location: '/api/catalogo-grelha/1' } })
}
