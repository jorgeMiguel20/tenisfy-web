// scripts/feed-stream.mjs
//
// Lê o ficheiro completo de produtos de um afiliado (pode ter centenas de
// MB) aos bocados, sem o carregar todo para a memória, e entrega um produto
// de cada vez. Aceita os três formatos habituais:
//   - { "productHeader": ..., "products": [ {...}, {...} ] }  (Tradedoubler)
//   - [ {...}, {...} ]
//   - um produto JSON por linha
// Se o ficheiro vier comprimido (gzip), descomprime pelo caminho.
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'

export async function* streamProducts(response, stats = {}) {
  let source = Readable.fromWeb(response.body)
  const it = source[Symbol.asyncIterator]()
  const first = await it.next()
  if (first.done) return
  let head = Buffer.from(first.value)
  stats.firstBytes = head.subarray(0, 4).toString('hex')

  async function* rest() {
    yield head
    for (;;) {
      const r = await it.next()
      if (r.done) return
      yield Buffer.from(r.value)
    }
  }
  let chunks = rest()
  if (head[0] === 0x1f && head[1] === 0x8b) {
    stats.gzip = true
    chunks = Readable.from(chunks).pipe(createGunzip())
  }

  const decoder = new TextDecoder('utf-8')
  let mode = null
  let preview = ''
  const stack = []
  let inString = false
  let escape = false
  let capturing = false
  let captureDepth = 0
  let buf = ''
  let bytes = 0

  for await (const chunk of chunks) {
    bytes += chunk.length
    const text = decoder.decode(chunk, { stream: true })
    if (mode === null) {
      preview += text
      if (preview.length < 200) continue
      stats.preview = preview.slice(0, 300)
      if (/^\s*\[/.test(preview)) mode = 'array'
      else if (/^\s*\{\s*"(productHeader|products)"/.test(preview)) mode = 'wrapped'
      else mode = 'ndjson'
      stats.mode = mode
      yield* scan(preview)
      continue
    }
    yield* scan(text)
  }
  stats.bytes = bytes

  function* scan(text) {
    let start = capturing ? 0 : -1
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i)
      if (inString) {
        if (escape) escape = false
        else if (c === 92) escape = true // \
        else if (c === 34) inString = false // "
        continue
      }
      if (c === 34) { inString = true; continue }
      if (c === 123 || c === 91) { // { [
        if (!capturing && c === 123 && isProductStart()) {
          capturing = true
          captureDepth = stack.length
          start = i
          buf = ''
        }
        stack.push(c)
      } else if (c === 125 || c === 93) { // } ]
        stack.pop()
        if (capturing && c === 125 && stack.length === captureDepth) {
          buf += text.slice(start, i + 1)
          capturing = false
          start = -1
          const raw = buf
          buf = ''
          yield raw
        }
      }
    }
    if (capturing && start >= 0) buf += text.slice(start)
  }

  function isProductStart() {
    if (mode === 'ndjson') return stack.length === 0
    if (mode === 'array') return stack.length === 1 && stack[0] === 91
    // wrapped: root { -> "products": [ -> { produto }
    return stack.length === 2 && stack[0] === 123 && stack[1] === 91
  }
}
