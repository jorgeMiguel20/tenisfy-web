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

export async function normalizePhoto(input) {
  const { data: p, info } = await sharp(input).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const ch = info.channels // 3
  const n = w * h
  const at = (x, y) => (y * w + x) * ch
  const corners = [at(2, 2), at(w - 3, 2), at(2, h - 3), at(w - 3, h - 3)]
  const ref = [0, 1, 2].map((j) => corners.reduce((s, k) => s + p[k + j], 0) / 4)
  const dist = (k) => Math.max(Math.abs(p[k] - ref[0]), Math.abs(p[k + 1] - ref[1]), Math.abs(p[k + 2] - ref[2]))

  const bg = new Uint8Array(n)
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  const push = (i) => {
    if (bg[i] === 0 && dist(i * ch) <= TOLERANCE) {
      bg[i] = 1
      queue[tail++] = i
    }
  }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  while (head < tail) {
    const i = queue[head++]
    const x = i % w
    if (x > 0) push(i - 1)
    if (x < w - 1) push(i + 1)
    if (i >= w) push(i - w)
    if (i < n - w) push(i + w)
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
  const bgShare = tail / n
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
