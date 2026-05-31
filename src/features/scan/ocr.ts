import type { Sticker } from '../../data/types'
import { getStickerByNumber, getCatalog } from '../../data/catalog'

// ─── Image Preprocessing ─────────────────────────────────────────────────────

/**
 * Preprocess image data for better OCR accuracy:
 * 1. Convert to grayscale
 * 2. Boost contrast
 * 3. Apply threshold/binarization
 * 4. Upscale 2x for better digit recognition
 */
export function preprocessImageData(
  imageData: ImageData,
  scale: number = 2
): ImageData {
  const { width, height, data } = imageData

  // Create grayscale buffer
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    // Standard luminance formula
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  }

  // Boost contrast (stretch histogram)
  const minGray = Math.min(...gray)
  const maxGray = Math.max(...gray)
  const range = maxGray - minGray || 1

  const contrasted = new Uint8ClampedArray(width * height)
  for (let i = 0; i < gray.length; i++) {
    // Stretch to full 0-255 range
    contrasted[i] = Math.round(((gray[i] - minGray) / range) * 255)
  }

  // Apply threshold (binarize) - pixels above threshold become 255, below become 0
  const threshold = 128
  const binarized = new Uint8ClampedArray(width * height)
  for (let i = 0; i < contrasted.length; i++) {
    binarized[i] = contrasted[i] > threshold ? 255 : 0
  }

  // Create new ImageData with upscaled dimensions
  const newWidth = width * scale
  const newHeight = height * scale
  const newData = new Uint8ClampedArray(newWidth * newHeight * 4)

  // Upscale using nearest neighbor (pixelated look is fine for OCR)
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor(x / scale)
      const srcY = Math.floor(y / scale)
      const srcIdx = srcY * width + srcX
      const dstIdx = y * newWidth + x

      const val = binarized[srcIdx]
      newData[dstIdx * 4] = val       // R
      newData[dstIdx * 4 + 1] = val   // G
      newData[dstIdx * 4 + 2] = val   // B
      newData[dstIdx * 4 + 3] = 255   // A
    }
  }

  return new ImageData(newData, newWidth, newHeight)
}

/**
 * Convert canvas to blob for Tesseract.js processing
 */
export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to convert canvas to blob'))
      }
    }, 'image/png')
  })
}

/**
 * Crop region of interest from image data
 */
export function cropImageData(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): ImageData {
  const srcData = imageData.data
  const srcWidth = imageData.width

  const newData = new Uint8ClampedArray(width * height * 4)

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const srcX = x + dx
      const srcY = y + dy

      if (srcX >= 0 && srcX < imageData.width && srcY >= 0 && srcY < imageData.height) {
        const srcIdx = (srcY * srcWidth + srcX) * 4
        const dstIdx = (dy * width + dx) * 4

        newData[dstIdx] = srcData[srcIdx]
        newData[dstIdx + 1] = srcData[srcIdx + 1]
        newData[dstIdx + 2] = srcData[srcIdx + 2]
        newData[dstIdx + 3] = srcData[srcIdx + 3]
      }
    }
  }

  return new ImageData(newData, width, height)
}

// ─── OCR Result Parsing ───────────────────────────────────────────────────────

/**
 * Extract digits from raw OCR text
 * Filters out non-numeric characters and handles common OCR errors
 */
export function parseDigitsFromOcr(rawText: string): number[] {
  // Extract contiguous digit sequences
  const digitSequences = rawText.match(/\d+/g) || []

  // Convert each sequence to array of individual digits
  const digits: number[] = []
  for (const seq of digitSequences) {
    for (const char of seq) {
      const digit = parseInt(char, 10)
      if (!isNaN(digit)) {
        digits.push(digit)
      }
    }
  }

  return digits
}

/**
 * Try to form valid sticker numbers from OCR digits
 * Panini stickers can be 1-3 digit numbers (1-980)
 * Returns all possible numbers that could be formed
 */
export function formStickerNumbers(digits: number[]): number[] {
  const numbers: number[] = []
  const catalog = getCatalog()

  if (!catalog) return numbers

  const maxNumber = Math.max(...catalog.stickers.map(s => s.number))

  // Try forming 1, 2, and 3 digit numbers
  for (let len = 1; len <= 3 && len <= digits.length; len++) {
    for (let start = 0; start <= digits.length - len; start++) {
      const numDigits = digits.slice(start, start + len)
      const num = numDigits.reduce((acc, d) => acc * 10 + d, 0)

      // Only include if it's a valid sticker number in catalog
      if (num >= 1 && num <= maxNumber) {
        const sticker = getStickerByNumber(num)
        if (sticker) {
          numbers.push(num)
        }
      }
    }
  }

  // Remove duplicates and sort
  return [...new Set(numbers)].sort((a, b) => a - b)
}

/**
 * Parse OCR result and return potential sticker numbers
 */
export function parseOcrResult(rawText: string): number[] {
  const digits = parseDigitsFromOcr(rawText)
  return formStickerNumbers(digits)
}

/**
 * Match parsed number(s) to stickers in catalog
 */
export function matchToCatalog(number: number): Sticker | Sticker[] {
  const catalog = getCatalog()
  if (!catalog) return []

  const matches = catalog.stickers.filter(s => s.number === number)
  return matches.length === 1 ? matches[0] : matches
}

// ─── Camera Helpers ───────────────────────────────────────────────────────────

/**
 * Check if device supports torch/flashlight
 */
export function supportsTorch(stream: MediaStream): boolean {
  const track = stream.getVideoTracks()[0]
  if (!track) return false

  const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
  return !!capabilities.torch
}

/**
 * Toggle torch on/off
 */
export async function setTorch(stream: MediaStream, enabled: boolean): Promise<boolean> {
  const track = stream.getVideoTracks()[0]
  if (!track) return false

  try {
    const constraints = { advanced: [{ torch: enabled } as MediaTrackConstraintSet] }
    await track.applyConstraints(constraints)
    return true
  } catch {
    return false
  }
}

/**
 * Capture frame from video element at specific time
 */
export function captureVideoFrame(
  video: HTMLVideoElement,
  timestamp?: number
): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const ctx = canvas.getContext('2d')!
  if (timestamp !== undefined) {
    video.currentTime = timestamp
  }
  ctx.drawImage(video, 0, 0)

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
