// scripts/feed-photos.mjs
//
// Trata a foto principal de um ténis importado (About You, ...) para ficar
// igual às outras fotos do Parjusto (ver scripts/normalize-product-photo.js):
//   1. troca o fundo da foto da loja (branco ou cinzento de estúdio) pelo
//      fundo dos cartões do Parjusto (249, 250, 251);
//   2. recorta a margem à volta do ténis;
//   3. centra o ténis num quadrado, a ocupar no máximo 85% da largura e 58%
//      da altura - assim cabe SEMPRE inteiro na caixa do cartão do catálogo
//      (mais larga do que alta), mesmo os de cano alto, sem nada cortado;
//   4. grava em WebP e envia para o Supabase Storage (pasta pública
//      "product-photos").
//
// O fundo é encontrado a partir das bordas da foto ("balde de tinta"): só
// muda a cor que toca nas bordas e é parecida com a dos cantos, por isso o
// ténis nunca é pintado, mesmo que tenha partes brancas.
import sharp from 'sharp'

const BG = [249, 250, 251]
const SIDE = 800
const MAX_W = 0.85
const MAX_H = 0.58
const TOLERANCE = 14
// modo estrito: o fundo também se espalha onde a cor muda devagar (degradé)
const GRADIENT_STEP = 3
const GRADIENT_MAX = 40

// Pede à loja a foto num tamanho razoável (as do ficheiro da About You vêm a
// 2000px).
export function sourcePhotoUrl(url) {
  try {
    const u = new URL(url)
    if (u.hostname === 'cdn.aboutyou.de') {
      u.searchParams.set('width', '800')
      u.searchParams.set('height', '1000')
    }
    // 4 Elementos (loja Shopify): as fotos do ficheiro vêm no tamanho
    // original; 1000px chega e descarrega muito mais depressa.
    if (u.hostname === 'cdn.shopify.com') u.searchParams.set('width', '1000')
    return u.toString()
  } catch {
    return url
  }
}

export async function normalizePhoto(input, opts = {}) {
  const { data: p, info } = await sharp(input).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const ch = info.channels // 3
  const n = w * h
  const at = (x, y) => (y * w + x) * ch
  const corners = [at(2, 2), at(w - 3, 2), at(2, h - 3), at(w - 3, h - 3)]
  const ref = [0, 1, 2].map((j) => corners.reduce((s, k) => s + p[k + j], 0) / 4)
  const dist = (k) => Math.max(Math.abs(p[k] - ref[0]), Math.abs(p[k + 1] - ref[1]), Math.abs(p[k + 2] - ref[2]))

  // Modo estrito (Direct-Volley, Ulanka): as fotos da loja têm muitas vezes
  // fundo em degradé (mais claro ao centro) e, às vezes, são um pormenor
  // ampliado ou um corte do ténis. Aqui o fundo também se espalha por zonas
  // onde a cor muda devagar (degradé), pequenas manchas soltas são limpas, e
  // se o ténis atravessa uma borda da foto está cortado e não serve.
  const strict = !!opts.strict
  const bg = new Uint8Array(n)
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  const stepDist = (a, b) => Math.max(Math.abs(p[a] - p[b]), Math.abs(p[a + 1] - p[b + 1]), Math.abs(p[a + 2] - p[b + 2]))
  const push = (i, from) => {
    if (bg[i] !== 0) return
    const k = i * ch
    const d = dist(k)
    if (d <= TOLERANCE || (strict && from >= 0 && d <= GRADIENT_MAX && stepDist(k, from * ch) <= GRADIENT_STEP)) {
      bg[i] = 1
      queue[tail++] = i
    }
  }
  for (let x = 0; x < w; x++) { push(x, -1); push((h - 1) * w + x, -1) }
  for (let y = 0; y < h; y++) { push(y * w, -1); push(y * w + w - 1, -1) }
  while (head < tail) {
    const i = queue[head++]
    const x = i % w
    if (x > 0) push(i - 1, i)
    if (x < w - 1) push(i + 1, i)
    if (i >= w) push(i - w, i)
    if (i < n - w) push(i + w, i)
  }
  const bgCount = tail

  if (strict) {
    // manchas soltas (ruído, reflexos) deixam de contar como ténis
    const label = new Int32Array(n)
    const sizes = [0]
    for (let i = 0; i < n; i++) {
      if (bg[i] || label[i]) continue
      const id = sizes.length
      let size = 0
      let qh = 0
      let qt = 0
      label[i] = id
      queue[qt++] = i
      while (qh < qt) {
        const j = queue[qh++]
        size++
        const x = j % w
        if (x > 0 && !bg[j - 1] && !label[j - 1]) { label[j - 1] = id; queue[qt++] = j - 1 }
        if (x < w - 1 && !bg[j + 1] && !label[j + 1]) { label[j + 1] = id; queue[qt++] = j + 1 }
        if (j >= w && !bg[j - w] && !label[j - w]) { label[j - w] = id; queue[qt++] = j - w }
        if (j < n - w && !bg[j + w] && !label[j + w]) { label[j + w] = id; queue[qt++] = j + w }
      }
      sizes.push(size)
    }
    const minSize = Math.max(150, Math.round(n * 0.003))
    for (let i = 0; i < n; i++) if (!bg[i] && sizes[label[i]] < minSize) bg[i] = 1
    // o ténis atravessa uma borda da foto? (uma ponta que só toca não conta)
    const run = (idx, len) => { let c = 0; for (let t = 0; t < len; t++) if (!bg[idx(t)]) c++; return c > Math.max(6, len * 0.02) }
    if (run((t) => t, w) || run((t) => (h - 1) * w + t, w) || run((t) => t * w, h) || run((t) => t * w + w - 1, h)) throw new Error('ténis cortado na foto')
  }

  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let i = 0; i < n; i++) {
    const k = i * ch
    if (bg[i]) {
      p[k] = BG[0]; p[k + 1] = BG[1]; p[k + 2] = BG[2]
      continue
    }
    // orla suave: só os pixels da borda do ténis (encostados ao fundo) e
    // quase da cor do fundo antigo se misturam com o fundo novo - o interior
    // do ténis (ex.: uma sola branca) fica sempre como está.
    const x = i % w
    const y = (i - x) / w
    const touchesBg = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (i >= w && bg[i - w]) || (i < n - w && bg[i + w])
    const d = touchesBg ? dist(k) : Infinity
    if (d < TOLERANCE * 2.5) {
      const t = Math.max(0, Math.min(1, (d - TOLERANCE) / (TOLERANCE * 1.5)))
      for (let j = 0; j < 3; j++) p[k + j] = Math.round(BG[j] + (p[k + j] - BG[j]) * t)
    }
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  if (x1 < 0) throw new Error('foto sem ténis (só fundo)')
  const bw = x1 - x0 + 1
  const bh = y1 - y0 + 1
  // Um ténis de lado é mais largo do que alto (de frente, de cima ou só um
  // pormenor não servem como foto principal).
  if (strict && bw / bh < 1.05) throw new Error('ténis não está de lado')
  const bgShare = bgCount / n
  // Se quase nada for fundo, o fundo não era uniforme (foto de ambiente):
  // não serve como foto principal.
  if (bgShare < 0.2) throw new Error('fundo não uniforme')

  const side = Math.max(bw / MAX_W, bh / MAX_H)
  const scale = SIDE / side
  const tw = Math.max(1, Math.round(bw * scale))
  const th = Math.max(1, Math.round(bh * scale))
  const shoe = await sharp(p, { raw: { width: w, height: h, channels: ch } })
    .extract({ left: x0, top: y0, width: bw, height: bh })
    .resize(tw, th)
    .png()
    .toBuffer()
  return sharp({ create: { width: SIDE, height: SIDE, channels: 3, background: { r: BG[0], g: BG[1], b: BG[2] } } })
    .composite([{ input: shoe, left: Math.round((SIDE - tw) / 2), top: Math.round((SIDE - th) / 2) }])
    .webp({ quality: 85 })
    .toBuffer()
}

export async function uploadPhoto({ supabaseUrl, key, path, buffer }) {
  const r = await fetch(`${supabaseUrl}/storage/v1/object/product-photos/${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'image/webp', 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' },
    body: buffer,
  })
  if (!r.ok) throw new Error(`upload HTTP ${r.status} ${(await r.text()).slice(0, 200)}`)
  return `${supabaseUrl}/storage/v1/object/public/product-photos/${path}`
}

// Descarrega, trata e envia. Devolve o endereço público da foto tratada.
export async function processAndUpload({ supabaseUrl, key, sourceUrl, path }) {
  const res = await fetch(sourcePhotoUrl(sourceUrl))
  if (!res.ok) throw new Error(`download HTTP ${res.status}`)
  const input = Buffer.from(await res.arrayBuffer())
  const buffer = await normalizePhoto(input)
  return uploadPhoto({ supabaseUrl, key, path, buffer })
}

// Experimenta as fotos da lista por ordem (a principal da loja e as da
// galeria) e fica com a primeira em que o ténis aparece inteiro e de lado.
// Devolve { url, used } (used = a foto original escolhida).
export async function processAndUploadBest({ supabaseUrl, key, sourceUrls, path }) {
  const errors = []
  for (const sourceUrl of sourceUrls.slice(0, 6)) {
    try {
      const res = await fetch(sourcePhotoUrl(sourceUrl))
      if (!res.ok) throw new Error('download HTTP ' + res.status)
      const input = Buffer.from(await res.arrayBuffer())
      const buffer = await normalizePhoto(input, { strict: true })
      const url = await uploadPhoto({ supabaseUrl, key, path, buffer })
      return { url, used: sourceUrl }
    } catch (e) {
      errors.push(String(e?.message || e).slice(0, 60))
    }
  }
  throw new Error('nenhuma foto serve: ' + errors.join(' / '))
}
