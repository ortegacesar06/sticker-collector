// ─── Catalog Types ────────────────────────────────────────────────────────────

export type StickerType = 'player' | 'logo' | 'emblem' | 'stadium' | 'manager'

export interface Sticker {
  /** Unique sticker number in the album (e.g. 1, 2, 3...) */
  number: number
  /** Player or item name */
  name: string
  /** FIFA three-letter country code */
  team: string
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string
  /** Playing position */
  position: StickerType
  /** Club name (for players) */
  club?: string
  /** Jersey number */
  jersey?: number
  /** Image filename inside public/assets/stickers/ */
  image: string
  /** Album page number */
  page?: number
}

export interface Team {
  code: string
  name: string
  countryCode: string
  flagImage: string
}

export interface Catalog {
  version: string
  total: number
  stickers: Sticker[]
}

// ─── Collection Types ─────────────────────────────────────────────────────────

export type FilterType = 'all' | 'have' | 'missing' | 'duplicates'

export interface CollectionEntry {
  stickerNumber: number
  count: number
  lastUpdated: number // unix timestamp ms
}

export interface CollectionMeta {
  id: 'meta'
  lastBackupAt?: number
  theme?: 'light' | 'dark' | 'system'
}

// ─── Trade / Stats Types ─────────────────────────────────────────────────────

export interface TradeListItem {
  stickerNumber: number
  name: string
  team: string
  count: number
}

export interface TeamProgress {
  team: string
  total: number
  have: number
  missing: number
  duplicates: number
  progress: number // 0–100
}

// ─── OCR Types ───────────────────────────────────────────────────────────────

export interface OcrResult {
  number: number | null
  confidence: number
  raw: string
}

export interface ScanConfirm {
  sticker: Sticker
  count: number
  action: 'add' | 'subtract' | 'set'
}
