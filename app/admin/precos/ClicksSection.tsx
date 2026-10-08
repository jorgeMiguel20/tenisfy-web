// app/admin/precos/ClicksSection.tsx
//
// Resumo dos cliques em "Ver oferta" (ver app/api/out-click/route.ts): é o
// número que as redes de afiliados e as lojas perguntam. Só leitura.

export type ClicksSummary = {
  last7: number
  last30: number
  byStore: { name: string; count: number }[]
  byProduct: { slug: string; count: number }[]
}

export default function ClicksSection({ summary }: { summary: ClicksSummary | null }) {
  return (
    <section className="mt-10 text-left">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Cliques em &quot;Ver oferta&quot;</h2>
      <p className="text-sm text-gray-500 mb-4">
        Quantas vezes alguém saiu do Parjusto para uma loja. Robôs e cliques repetidos em excesso não contam.
      </p>

      {!summary ? (
        <p className="text-sm text-gray-400">Não foi possível carregar os cliques.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div className="border border-gray-200 rounded-none p-4">
              <p className="text-xs text-gray-500">Últimos 7 dias</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{summary.last7}</p>
            </div>
            <div className="border border-gray-200 rounded-none p-4">
              <p className="text-xs text-gray-500">Últimos 30 dias</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{summary.last30}</p>
            </div>
          </div>

          {summary.last30 > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 mt-6">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Por loja (30 dias)</p>
                <ul className="text-sm text-gray-700 divide-y divide-gray-100 border-y border-gray-100">
                  {summary.byStore.map((s) => (
                    <li key={s.name} className="flex justify-between py-1.5">
                      <span>{s.name}</span>
                      <span className="tabular-nums font-medium">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Ténis mais clicados (30 dias)</p>
                <ul className="text-sm text-gray-700 divide-y divide-gray-100 border-y border-gray-100">
                  {summary.byProduct.map((p) => (
                    <li key={p.slug} className="flex justify-between gap-3 py-1.5">
                      <a href={`/produto/${p.slug}`} target="_blank" rel="noopener" className="truncate hover:underline">
                        {p.slug}
                      </a>
                      <span className="tabular-nums font-medium">{p.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
