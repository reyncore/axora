/**
 * scripts/generate-icons.mjs — Generate PNG icons untuk PWA
 * Jalankan: node scripts/generate-icons.mjs
 * Requires: npm install -D sharp
 */

import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dir, '../public/icons/icon.svg')
const outDir  = join(__dir, '../public/icons')

mkdirSync(outDir, { recursive: true })

const svgBuffer = readFileSync(svgPath)

const ICONS = [
  { name: 'icon-192',          size: 192 },
  { name: 'icon-192-maskable', size: 192 },
  { name: 'icon-512',          size: 512 },
  { name: 'icon-512-maskable', size: 512 },
  { name: 'apple-touch-icon',  size: 180 },
]

for (const { name, size } of ICONS) {
  await sharp(svgBuffer).resize(size, size).png().toFile(join(outDir, `${name}.png`))
  console.log(`✓ ${name}.png`)
}
console.log('Done!')
