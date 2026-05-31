import { useState, useRef, useEffect, useCallback } from 'react'
import type { Sticker, OcrResult } from '../../data/types'
import { useCollectionStore } from '../../store/collectionStore'
import { ScanConfirmCard } from './ScanConfirmCard'
import { TeamSelector } from './TeamSelector'
import { ManualEntryPad } from './ManualEntryPad'
import {
  preprocessImageData,
  cropImageData,
  captureVideoFrame,
  parseOcrResult,
  matchToCatalog,
  supportsTorch,
  setTorch,
} from './ocr'

// ─── State ────────────────────────────────────────────────────────────────────

type ScanMode = 'camera' | 'confirm' | 'select-team' | 'manual'

interface ScannerState {
  mode: ScanMode
  isScanning: boolean
  ocrResult: OcrResult | null
  detectedNumber: number | null
  selectedSticker: Sticker | null
  ambiguousMatches: Sticker[]
  error: string | null
  torchEnabled: boolean
  cameraReady: boolean
}

// ─── Guide overlay dimensions ──────────────────────────────────────────────────
// The number on Panini stickers typically appears in the bottom-right area
// We use a fixed aspect ratio region that will be cropped for OCR

const GUIDE_RATIO = 0.15 // Width is 15% of video width
const GUIDE_POSITION = { right: 0.05, bottom: 0.15 } // Position from right and bottom

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const [state, setState] = useState<ScannerState>({
    mode: 'camera',
    isScanning: false,
    ocrResult: null,
    detectedNumber: null,
    selectedSticker: null,
    ambiguousMatches: [],
    error: null,
    torchEnabled: false,
    cameraReady: false,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const tesseractRef = useRef<typeof import('tesseract.js') | null>(null)

  const increment = useCollectionStore((s) => s.increment)

  // ─── Camera setup ──────────────────────────────────────────────────────────

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const canTorch = supportsTorch(stream)

      setState(prev => ({
        ...prev,
        cameraReady: true,
        torchEnabled: false,
        error: null,
      }))

      return { stream, canTorch }
    } catch (err) {
      setState(prev => ({
        ...prev,
        cameraReady: false,
        error: 'No se pudo acceder a la cámara',
      }))
      return null
    }
  }, [])

  // ─── Lazy load Tesseract.js ────────────────────────────────────────────────

  const loadTesseract = useCallback(async () => {
    if (tesseractRef.current) return tesseractRef.current

    const Tesseract = await import('tesseract.js')
    tesseractRef.current = Tesseract
    return Tesseract
  }, [])

  // ─── Capture and process frame ──────────────────────────────────────────────

  const captureAndProcess = useCallback(async () => {
    const video = videoRef.current
    if (!video || state.isScanning) return

    setState(prev => ({ ...prev, isScanning: true }))

    try {
      // Capture frame
      const imageData = captureVideoFrame(video)

      // Calculate guide region
      const guideWidth = Math.floor(video.videoWidth * GUIDE_RATIO)
      const guideHeight = Math.floor(guideWidth * 1.2) // Slightly taller than wide
      const guideX = Math.floor(video.videoWidth * (1 - GUIDE_POSITION.right) - guideWidth)
      const guideY = Math.floor(video.videoHeight * (1 - GUIDE_POSITION.bottom) - guideHeight)

      // Crop to guide region
      const cropped = cropImageData(imageData, guideX, guideY, guideWidth, guideHeight)

      // Preprocess
      const processed = preprocessImageData(cropped, 2)

      // Draw to canvas for OCR
      const canvas = canvasRef.current!
      canvas.width = processed.width
      canvas.height = processed.height
      const ctx = canvas.getContext('2d')!
      ctx.putImageData(processed, 0, 0)

      // Run OCR
      const Tesseract = await loadTesseract()
      const result = await Tesseract.recognize(canvas, 'eng')

      const rawText = result.data.text
      const detectedNumbers = parseOcrResult(rawText)

      // Find best match (first valid sticker number)
      let detectedNumber: number | null = null
      let selectedSticker: Sticker | null = null
      let ambiguousMatches: Sticker[] = []

      for (const num of detectedNumbers) {
        const match = matchToCatalog(num)
        if (Array.isArray(match)) {
          // Ambiguous - same number on multiple teams
          ambiguousMatches = match
          detectedNumber = num
          break
        } else if (match) {
          selectedSticker = match
          detectedNumber = num
          break
        }
      }

      if (ambiguousMatches.length > 0) {
        setState(prev => ({
          ...prev,
          mode: 'select-team',
          isScanning: false,
          ocrResult: { number: detectedNumber, confidence: result.data.confidence, raw: rawText },
          detectedNumber,
          ambiguousMatches,
        }))
      } else if (selectedSticker) {
        setState(prev => ({
          ...prev,
          mode: 'confirm',
          isScanning: false,
          ocrResult: { number: detectedNumber, confidence: result.data.confidence, raw: rawText },
          detectedNumber,
          selectedSticker,
          ambiguousMatches: [],
        }))
      } else {
        // No match found
        setState(prev => ({
          ...prev,
          isScanning: false,
          ocrResult: { number: null, confidence: result.data.confidence, raw: rawText },
          error: 'No se reconoció ningún número',
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: 'Error en el procesamiento',
      }))
    }
  }, [state.isScanning, loadTesseract])

  // ─── Torch toggle ──────────────────────────────────────────────────────────

  const toggleTorch = useCallback(async () => {
    const stream = streamRef.current
    if (!stream) return

    const newTorchState = !state.torchEnabled
    const success = await setTorch(stream, newTorchState)
    if (success) {
      setState(prev => ({ ...prev, torchEnabled: newTorchState }))
    }
  }, [state.torchEnabled])

  // ─── File input fallback ───────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isScanning: true }))

    try {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      const canvas = canvasRef.current!
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      // Use center region as guide area
      const regionSize = Math.min(img.width, img.height) * 0.2
      const regionX = (img.width - regionSize) * 0.8
      const regionY = (img.height - regionSize) * 0.75

      const imageData = ctx.getImageData(regionX, regionY, regionSize, regionSize)
      const processed = preprocessImageData(imageData, 2)

      canvas.width = processed.width
      canvas.height = processed.height
      ctx.putImageData(processed, 0, 0)

      const Tesseract = await loadTesseract()
      const result = await Tesseract.recognize(canvas, 'eng')

      const rawText = result.data.text
      const detectedNumbers = parseOcrResult(rawText)

      let detectedNumber: number | null = null
      let selectedSticker: Sticker | null = null
      let ambiguousMatches: Sticker[] = []

      for (const num of detectedNumbers) {
        const match = matchToCatalog(num)
        if (Array.isArray(match)) {
          ambiguousMatches = match
          detectedNumber = num
          break
        } else if (match) {
          selectedSticker = match
          detectedNumber = num
          break
        }
      }

      if (ambiguousMatches.length > 0) {
        setState(prev => ({
          ...prev,
          mode: 'select-team',
          isScanning: false,
          ocrResult: { number: detectedNumber, confidence: result.data.confidence, raw: rawText },
          detectedNumber,
          ambiguousMatches,
        }))
      } else if (selectedSticker) {
        setState(prev => ({
          ...prev,
          mode: 'confirm',
          isScanning: false,
          ocrResult: { number: detectedNumber, confidence: result.data.confidence, raw: rawText },
          detectedNumber,
          selectedSticker,
          ambiguousMatches: [],
        }))
      } else {
        setState(prev => ({
          ...prev,
          isScanning: false,
          ocrResult: { number: null, confidence: result.data.confidence, raw: rawText },
          error: 'No se reconoció ningún número',
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: 'Error procesando imagen',
      }))
    }
  }, [loadTesseract])

  // ─── Confirm/correct/discard handlers ──────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (state.selectedSticker) {
      await increment(state.selectedSticker.number)

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30)
      }

      // Animate and return to camera (continuous mode)
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          mode: 'camera',
          selectedSticker: null,
          ocrResult: null,
          detectedNumber: null,
        }))
      }, 500)
    }
  }, [state.selectedSticker, increment])

  const handleCorrect = useCallback(() => {
    setState(prev => ({
      ...prev,
      mode: 'manual',
    }))
  }, [])

  const handleDiscard = useCallback(() => {
    setState(prev => ({
      ...prev,
      mode: 'camera',
      selectedSticker: null,
      ocrResult: null,
      detectedNumber: null,
      error: null,
    }))
  }, [])

  const handleTeamSelect = useCallback((sticker: Sticker) => {
    setState(prev => ({
      ...prev,
      mode: 'confirm',
      selectedSticker: sticker,
      ambiguousMatches: [],
    }))
  }, [])

  const handleManualConfirm = useCallback((sticker: Sticker) => {
    setState(prev => ({
      ...prev,
      mode: 'confirm',
      selectedSticker: sticker,
      detectedNumber: sticker.number,
      ocrResult: { number: sticker.number, confidence: 100, raw: String(sticker.number) },
    }))
  }, [])

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    initCamera()

    return () => {
      // Cleanup stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [initCamera])

  // ─── Render ────────────────────────────────────────────────────────────────

  const canTorch = streamRef.current ? supportsTorch(streamRef.current) : false

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Manual entry mode */}
      {state.mode === 'manual' && (
        <ManualEntryPad
          onConfirm={handleManualConfirm}
          onCancel={handleDiscard}
        />
      )}

      {/* Camera/scanner view */}
      {(state.mode === 'camera' || state.mode === 'confirm' || state.mode === 'select-team') && (
        <>
          {/* Video preview */}
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />

            {/* Guide overlay */}
            {state.mode === 'camera' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Corner markers */}
                <div className="relative w-1/3 aspect-[3/4]">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-accent rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-accent rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-accent rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-accent rounded-br-lg" />

                  {/* Instruction text */}
                  <div className="absolute -bottom-8 left-0 right-0 text-center">
                    <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                      Apuntá al número
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Scanning indicator */}
            {state.isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-white text-sm">Escaneando...</span>
                </div>
              </div>
            )}

            {/* Error toast */}
            {state.error && (
              <div className="absolute top-4 left-4 right-4 bg-danger text-white text-center py-2 px-4 rounded-lg">
                {state.error}
              </div>
            )}

            {/* Top controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
              <div className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                #{state.detectedNumber || '—'}
              </div>

              <div className="flex gap-2">
                {canTorch && (
                  <button
                    onClick={toggleTorch}
                    className={`
                      p-3 rounded-full transition-all
                      ${state.torchEnabled ? 'bg-gold text-ink' : 'bg-black/50 text-white'}
                    `}
                    aria-label="Linterna"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={() => setState(prev => ({ ...prev, mode: 'manual' }))}
                  className="p-3 rounded-full bg-black/50 text-white"
                  aria-label="Entrada manual"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="p-6 flex flex-col items-center gap-4 bg-black">
            {/* Capture button */}
            <button
              onClick={captureAndProcess}
              disabled={state.isScanning || state.mode !== 'camera'}
              className={`
                w-20 h-20 rounded-full border-4 transition-all active:scale-90
                ${state.isScanning
                  ? 'border-missing bg-missing/20'
                  : 'border-white bg-white/20 hover:bg-white/30'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label="Capturar"
            >
              {state.isScanning ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="w-full h-full bg-white rounded-full" />
              )}
            </button>

            {/* File input fallback */}
            <label className="text-white/70 text-sm cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) processFile(file)
                }}
              />
              Usar foto existente
            </label>
          </div>

          {/* Confirm card */}
          {state.mode === 'confirm' && state.selectedSticker && (
            <ScanConfirmCard
              sticker={state.selectedSticker}
              onConfirm={handleConfirm}
              onCorrect={handleCorrect}
              onDiscard={handleDiscard}
            />
          )}

          {/* Team selector */}
          {state.mode === 'select-team' && state.detectedNumber && (
            <TeamSelector
              number={state.detectedNumber}
              matches={state.ambiguousMatches}
              onSelect={handleTeamSelect}
              onCancel={handleDiscard}
            />
          )}
        </>
      )}
    </div>
  )
}
