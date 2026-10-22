// scripts/awin-csv.mjs
//
// Lê um ficheiro CSV da Awin aos bocados (pode ter dezenas de milhares de
// linhas e centenas de MB depois de descomprimido) e entrega uma linha de cada
// vez, como objeto { coluna: valor }, sem guardar o ficheiro todo na memória.
// Se o ficheiro vier comprimido (gzip), descomprime pelo caminho.
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'

export async function* streamCsvRows(response) {
  let source = Readable.fromWeb(response.body)
  const it = source[Symbol.asyncIterator]()
  const first = await it.next()
  if (first.done) return
  const head = Buffer.from(first.value)
  async function* rest() {
    yield head
    for (;;) {
      const r = await it.next()
      if (r.done) return
      yield Buffer.from(r.value)
    }
  }
  let chunks = rest()
  if (head[0] === 0x1f && head[1] === 0x8b) chunks = Readable.from(chunks).pipe(createGunzip())

  const decoder = new TextDecoder('utf-8')
  let header = null
  let row = []
  let field = ''
  let quoted = false
  let pendingQuote = false // acabou de ver um " dentro de um campo entre aspas

  function* feed(text) {
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      if (pendingQuote) {
        pendingQuote = false
        if (c === '"') { field += '"'; continue }
        quoted = false // o " anterior fechava o campo
      }
      if (quoted) {
        if (c === '"') pendingQuote = true
        else field += c
      } else if (c === '"') quoted = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') {
        row.push(field)
        field = ''
        const r = row
        row = []
        if (!header) header = r
        else if (r.length >= header.length - 1) yield Object.fromEntries(header.map((h, k) => [h, r[k] ?? '']))
      } else if (c !== '\r') field += c
    }
  }

  for await (const chunk of chunks) yield* feed(decoder.decode(chunk, { stream: true }))
  yield* feed(decoder.decode())
  if (field || row.length) {
    row.push(field)
    if (header && row.length >= header.length - 1) yield Object.fromEntries(header.map((h, k) => [h, row[k] ?? '']))
  }
}
