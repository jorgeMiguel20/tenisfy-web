#!/usr/bin/env node
// scripts/normalize-product-photo.js
//
// Normaliza a FOTO PRINCIPAL de um produto (o que a base de dados guarda em
// products.image_url) para uma escala consistente com o resto do catálogo.
//
// Porque existe: a caixa da foto na grelha/hero/destaque/favoritos é sempre
// um quadrado com object-cover (ver components/ProductCard.tsx). Isso NÃO
// normaliza sozinho o "tamanho do produto dentro da caixa" - se a foto de
// origem já vier com pouca margem à volta do produto, o produto aparece
// grande; se vier com muita margem, aparece pequeno. Cada foto que entra no
// catálogo tem de passar por aqui antes de se tornar a foto principal.
//
// O que faz:
//   1. Deteta e recorta (trim) a margem de fundo uniforme à volta do produto.
//   2. Reenquadra para um canvas quadrado onde o produto ocupa exatamente
//      TARGET_FILL (por omissão 85%) do lado do quadrado, com a mesma
//      margem residual à volta em todas as fotos.
//   3. Grava o resultado em public/products/normalized/<slug>.webp -
//      NUNCA sobrescreve nem apaga o ficheiro original.
//
// Uso:
//   node scripts/normalize-product-photo.js <ficheiro-origem> <slug-produto> [preenchimento-alvo]
//
// Exemplo:
//   node scripts/normalize-product-photo.js public/products/nova-foto.jpg adidas-novo-modelo 0.85
//
// Depois de correr, o script imprime o caminho gerado e o UPDATE SQL exato
// para ligar esse ficheiro a products.image_url - corre esse SQL no
// Supabase SQL Editor (não é automático, para poderes rever antes).
//
// Se o resultado parecer estranho (aviso "REVER À MÃO" na consola), NÃO
// aplique o SQL sem antes abrir o ficheiro gerado e confirmar visualmente.

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const TARGET_FILL_DEFAULT = 0.85
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'products', 'normalized')
const CARD_BACKGROUND = { r: 249, g: 250, b: 251 } // Tailwind gray-50 - mesma cor do fundo da caixa no ProductCard

async function normalize(inputPath, slug, targetFill = TARGET_FILL_DEFAULT) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Ficheiro de origem não encontrado: ${inputPath}`)
  }

  const meta = await sharp(inputPath).metadata()
  const { width: W, height: H } = meta

  const trimmed = await sharp(inputPath).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true })
  const { width: contentW, height: contentH, trimOffsetLeft, trimOffsetTop } = trimmed.info

  const trimFoundNothing = contentW === W && contentH === H
  const contentMaxDim = Math.max(contentW, contentH)
  const canvasSide = Math.round(contentMaxDim / targetFill)

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const outputPath = path.join(OUTPUT_DIR, `${slug}.webp`)

  // sharp devolve trimOffsetLeft/Top como valores <= 0 (deslocamento
  // relativo, não a posição) - a posição real no original é o valor
  // absoluto. Confirmado empiricamente: usar o valor tal qual (sem abs)
  // extraía a partir do canto superior esquerdo em vez do conteúdo real.
  const extractLeft = Math.max(0, Math.abs(trimOffsetLeft ?? 0))
  const extractTop = Math.max(0, Math.abs(trimOffsetTop ?? 0))

  const contentBuffer = await sharp(inputPath)
    .extract({
      left: extractLeft,
      top: extractTop,
      width: contentW,
      height: contentH,
    })
    .toBuffer()

  await sharp({
    create: {
      width: canvasSide,
      height: canvasSide,
      channels: 3,
      background: CARD_BACKGROUND,
    },
  })
    .composite([
      {
        input: contentBuffer,
        left: Math.round((canvasSide - contentW) / 2),
        top: Math.round((canvasSide - contentH) / 2),
      },
    ])
    .webp({ quality: 90 })
    .toFile(outputPath)

  // Warnings - não decide sozinho quando o resultado é duvidoso.
  const warnings = []
  if (trimFoundNothing) {
    warnings.push(
      'O trim não encontrou margem nenhuma para recortar (fundo não uniforme, ex: sombra em degradê). ' +
        'O enquadramento resultante pode não estar correto - confirma visualmente antes de usar.'
    )
  }
  const upscaleFactor = canvasSide / Math.max(W, H)
  if (upscaleFactor > 1.15) {
    warnings.push(
      `A normalização exige aumentar a imagem em ${Math.round((upscaleFactor - 1) * 100)}% (canvas ${canvasSide}px vs original ${Math.max(W, H)}px) - pode perder nitidez.`
    )
  }
  if (contentMaxDim / Math.min(W, H) > 0.98) {
    warnings.push(
      'O produto já toca (ou quase) nas bordas da foto original - normalizar para ' +
        `${Math.round(targetFill * 100)}% pode não deixar margem suficiente de um dos lados. Confirma visualmente.`
    )
  }

  return {
    outputPath,
    original: { width: W, height: H },
    content: { width: contentW, height: contentH },
    canvasSide,
    achievedFillPct: Math.round(targetFill * 100),
    warnings,
  }
}

async function main() {
  const [, , inputPath, slug, targetFillArg] = process.argv
  if (!inputPath || !slug) {
    console.error('Uso: node scripts/normalize-product-photo.js <ficheiro-origem> <slug-produto> [preenchimento-alvo=0.85]')
    process.exit(1)
  }
  const targetFill = targetFillArg ? parseFloat(targetFillArg) : TARGET_FILL_DEFAULT

  const result = await normalize(inputPath, slug, targetFill)

  console.log('')
  console.log(`Original: ${result.original.width}x${result.original.height}`)
  console.log(`Conteúdo detetado (trim): ${result.content.width}x${result.content.height}`)
  console.log(`Canvas final: ${result.canvasSide}x${result.canvasSide} (produto a ~${result.achievedFillPct}% do lado)`)
  console.log(`Gravado em: ${result.outputPath}`)

  if (result.warnings.length > 0) {
    console.log('')
    console.log('⚠️  REVER À MÃO antes de aplicar:')
    for (const w of result.warnings) console.log('   - ' + w)
  } else {
    console.log('')
    console.log('Sem avisos - parece seguro, mas confirma sempre visualmente.')
  }

  console.log('')
  console.log('SQL para ligar esta foto como principal (revê antes de correr):')
  console.log(`  update products set image_url = '/products/normalized/${slug}.webp' where slug = '${slug}';`)
  console.log('')
}

main().catch((e) => {
  console.error('Erro:', e.message)
  process.exit(1)
})
