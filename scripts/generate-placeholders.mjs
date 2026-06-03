// Script to generate placeholder images for PWA icons and stickers
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = resolve(__dirname, '..')

// Create a simple 1x1 pink PNG (base64)
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, // IHDR length
  0x49, 0x48, 0x44, 0x52, // IHDR
  0x00, 0x00, 0x00, 0x01, // width: 1
  0x00, 0x00, 0x00, 0x01, // height: 1
  0x08, 0x02, // bit depth: 8, color type: RGB
  0x00, 0x00, 0x00, // compression, filter, interlace
  0x90, 0x77, 0x53, 0xDE, // CRC
])

const IDAT = Buffer.from([
  0x00, 0x00, 0x00, 0x0A, // length
  0x49, 0x44, 0x41, 0x54, // IDAT
  0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0xFF, 0x00, 0x05, 0xFE, 0x02, // compressed data
  0x25, 0x1A, 0x4D, 0xB6, // CRC
])

const IEND = Buffer.from([
  0x00, 0x00, 0x00, 0x00, // length
  0x49, 0x45, 0x4E, 0x44, // IEND
  0xAE, 0x42, 0x60, 0x82, // CRC
])

function createSolidPng(width, height, r, g, b) {
  // Create a minimal valid PNG with solid color
  // Using a simple approach - create raw pixel data and compress it
  const rawData = []
  for (let y = 0; y < height; y++) {
    rawData.push(0) // filter byte
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b)
    }
  }

  // Use zlib to compress
  const compressed = zlib.deflateSync(Buffer.from(rawData))

  // Build PNG file
  const chunks = []

  // PNG signature
  chunks.push(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type (RGB)
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  chunks.push(createChunk('IHDR', ihdr))
  chunks.push(createChunk('IDAT', compressed))
  chunks.push(createChunk('IEND', Buffer.alloc(0)))

  return Buffer.concat(chunks)
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])

  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcData), 0)

  return Buffer.concat([length, typeBuffer, data, crc])
}

function crc32(data) {
  let crc = 0xFFFFFFFF
  const table = makeCrcTable()
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF]
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function makeCrcTable() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xEDB88320 ^ (c >>> 1)
      } else {
        c = c >>> 1
      }
    }
    table[n] = c
  }
  return table
}

// Generate PWA icons (192x192 and 512x512) with Panini pink color
console.log('Generating PWA icons...')
const pinkColor = { r: 0xE5, g: 0x00, b: 0x7D } // Panini pink

const icon192 = createSolidPng(192, 192, pinkColor.r, pinkColor.g, pinkColor.b)
writeFileSync(join(ROOT_DIR, 'public/pwa-192x192.png'), icon192)
console.log('Created public/pwa-192x192.png')

const icon512 = createSolidPng(512, 512, pinkColor.r, pinkColor.g, pinkColor.b)
writeFileSync(join(ROOT_DIR, 'public/pwa-512x512.png'), icon512)
console.log('Created public/pwa-512x512.png')

// Generate sticker placeholders for stub data
console.log('\nGenerating sticker placeholders...')

// Ensure directories exist
const stickersDir = join(ROOT_DIR, 'public/assets/stickers')
if (!existsSync(stickersDir)) {
  mkdirSync(stickersDir, { recursive: true })
}

const catalog = JSON.parse(readFileSync(join(ROOT_DIR, 'public/data/catalog.2026.json'), 'utf-8'))

for (const sticker of catalog.stickers) {
  // Create team-colored placeholder (using team hash for consistent colors)
  const teamHash = sticker.team.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const hue = teamHash % 360
  const rgb = hslToRgb(hue / 360, 0.6, 0.5)

  const stickerImg = createSolidPng(150, 210, rgb.r, rgb.g, rgb.b)
  const imgPath = join(ROOT_DIR, 'public/assets/stickers', sticker.image)
  writeFileSync(imgPath, stickerImg)
  console.log(`Created ${sticker.image}`)
}

console.log('\nDone!')

function hslToRgb(h, s, l) {
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}
