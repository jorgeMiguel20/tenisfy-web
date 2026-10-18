// lib/fetchAll.ts
//
// O Supabase devolve no máximo 1000 linhas por pedido. Com o catálogo a
// crescer para milhares de ténis (importação automática da About You e de
// outras lojas), qualquer consulta "traz tudo" ficava cortada às 1000
// linhas sem dar erro nenhum - faltavam ténis sem ninguém perceber.
//
// fetchAll pede as linhas aos bocados de 1000 (de 0 a 999, de 1000 a 1999,
// ...) até vir um bocado incompleto, e junta tudo. A consulta tem de ter
// uma ordem fixa (.order(...)) para os bocados não se sobreporem.
type PageResult<T> = { data: T[] | null; error: { message: string } | null }

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000
): Promise<{ data: T[]; error: string | null }> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) return { data: rows, error: error.message }
    const chunk = data ?? []
    rows.push(...chunk)
    if (chunk.length < pageSize) return { data: rows, error: null }
  }
}
