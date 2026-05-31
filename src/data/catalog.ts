import type { Catalog, Sticker, StickerType } from './types'

// ─── Catalog Loading ─────────────────────────────────────────────────────────

const CATALOG_URL = '/data/catalog.2026.json'

let _catalog: Catalog | null = null

export async function loadCatalog(): Promise<Catalog> {
  if (_catalog) return _catalog

  const res = await fetch(CATALOG_URL)
  if (!res.ok) {
    throw new Error(`Failed to load catalog: ${res.status} ${res.statusText}`)
  }

  const data: unknown = await res.json()
  _catalog = validateCatalog(data)
  return _catalog
}

export function getCatalog(): Catalog | null {
  return _catalog
}

export function getStickerByNumber(number: number): Sticker | undefined {
  return _catalog?.stickers.find((s) => s.number === number)
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateCatalog(data: unknown): Catalog {
  if (!isObject(data)) throw new Error('Catalog must be an object')
  if (typeof data.version !== 'string') throw new Error('Catalog missing version')
  if (typeof data.total !== 'number') throw new Error('Catalog missing total')
  if (!Array.isArray(data.stickers)) throw new Error('Catalog missing stickers array')

  const stickers = data.stickers.map(validateSticker)
  return {
    version: data.version,
    total: data.total,
    stickers,
  }
}

function validateSticker(s: unknown, index: number): Sticker {
  if (!isObject(s)) throw new Error(`Sticker at index ${index} is not an object`)
  if (typeof s.number !== 'number') throw new Error(`Sticker[${index}]: missing number`)
  if (typeof s.name !== 'string') throw new Error(`Sticker[${index}]: missing name`)
  if (typeof s.team !== 'string') throw new Error(`Sticker[${index}]: missing team`)
  if (typeof s.countryCode !== 'string') throw new Error(`Sticker[${index}]: missing countryCode`)
  if (typeof s.position !== 'string') throw new Error(`Sticker[${index}]: missing position`)
  if (typeof s.image !== 'string') throw new Error(`Sticker[${index}]: missing image`)

  return {
    number: s.number as number,
    name: s.name as string,
    team: s.team as string,
    countryCode: s.countryCode as string,
    position: s.position as StickerType,
    club: typeof s.club === 'string' ? s.club : undefined,
    jersey: typeof s.jersey === 'number' ? s.jersey : undefined,
    image: s.image as string,
    page: typeof s.page === 'number' ? s.page : undefined,
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// ─── Team helpers ─────────────────────────────────────────────────────────────

export function getTeams(catalog: Catalog): string[] {
  const teams = [...new Set(catalog.stickers.map((s) => s.team))]
  return teams.sort()
}

export function getStickersByTeam(catalog: Catalog, team: string): Sticker[] {
  return catalog.stickers.filter((s) => s.team === team)
}
