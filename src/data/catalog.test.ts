import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { Catalog } from './types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validCatalog: Catalog = {
  version: '1.0.0',
  total: 50,
  stickers: [
    { number: 1, name: 'Logo Argentina', team: 'ARG', countryCode: 'AR', position: 'emblem', image: 'arg-emblems.png' },
    { number: 2, name: 'Lionel Messi', team: 'ARG', countryCode: 'AR', position: 'player', club: 'Inter Miami', jersey: 10, image: 'arg-10-messi.png' },
    { number: 3, name: 'Player Three', team: 'BRA', countryCode: 'BR', position: 'player', image: 'bra-1.png' },
  ],
}

// We test the catalog module by mocking fetch to avoid network calls
const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Catalog loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module state by clearing the private _catalog variable
    // We do this by calling loadCatalog with invalid data to reset
  })

  describe('loadCatalog', () => {
    it('returns parsed and validated catalog', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validCatalog),
      })

      // Re-import to reset module state
      vi.resetModules()
      const { loadCatalog } = await import('./catalog')

      const catalog = await loadCatalog()

      expect(catalog.version).toBe('1.0.0')
      expect(catalog.total).toBe(50)
      expect(catalog.stickers).toHaveLength(3)
    })

    it('throws when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      vi.resetModules()
      const { loadCatalog } = await import('./catalog')

      await expect(loadCatalog()).rejects.toThrow('Failed to load catalog: 404 Not Found')
    })

    it('throws when catalog is not an object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve('not an object'),
      })

      vi.resetModules()
      const { loadCatalog } = await import('./catalog')

      await expect(loadCatalog()).rejects.toThrow('Catalog must be an object')
    })

    it('throws when catalog missing version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ total: 50, stickers: [] }),
      })

      vi.resetModules()
      const { loadCatalog } = await import('./catalog')

      await expect(loadCatalog()).rejects.toThrow('Catalog missing version')
    })

    it('throws when catalog missing total', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '1.0.0', stickers: [] }),
      })

      vi.resetModules()
      const { loadCatalog } = await import('./catalog')

      await expect(loadCatalog()).rejects.toThrow('Catalog missing total')
    })

    it('throws when catalog missing stickers array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '1.0.0', total: 50 }),
      })

      vi.resetModules()
      const { loadCatalog } = await import('./catalog')

      await expect(loadCatalog()).rejects.toThrow('Catalog missing stickers array')
    })

    it('throws when sticker missing number', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          version: '1.0.0',
          total: 1,
          stickers: [{ name: 'Test', team: 'ARG', countryCode: 'AR', position: 'player', image: 'test.png' }],
        }),
      })

      vi.resetModules()
      const { loadCatalog } = await import('./catalog')

      await expect(loadCatalog()).rejects.toThrow('Sticker[0]: missing number')
    })

    it('throws when sticker missing name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          version: '1.0.0',
          total: 1,
          stickers: [{ number: 1, team: 'ARG', countryCode: 'AR', position: 'player', image: 'test.png' }],
        }),
      })

      vi.resetModules()
      const { loadCatalog } = await import('./catalog')

      await expect(loadCatalog()).rejects.toThrow('Sticker[0]: missing name')
    })

    it('caches catalog after first load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validCatalog),
      })

      vi.resetModules()
      const { loadCatalog } = await import('./catalog')

      await loadCatalog()
      await loadCatalog()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('getStickerByNumber', () => {
    it('returns sticker with matching number', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validCatalog),
      })

      vi.resetModules()
      const { loadCatalog, getStickerByNumber } = await import('./catalog')

      await loadCatalog()

      const sticker = getStickerByNumber(2)
      expect(sticker).toBeDefined()
      expect(sticker!.name).toBe('Lionel Messi')
    })

    it('returns undefined for non-existent number', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validCatalog),
      })

      vi.resetModules()
      const { loadCatalog, getStickerByNumber } = await import('./catalog')

      await loadCatalog()

      const sticker = getStickerByNumber(999)
      expect(sticker).toBeUndefined()
    })
  })

  describe('getTeams', () => {
    it('returns sorted unique team codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validCatalog),
      })

      vi.resetModules()
      const { loadCatalog, getTeams } = await import('./catalog')

      const catalog = await loadCatalog()
      const teams = getTeams(catalog)

      expect(teams).toEqual(['ARG', 'BRA'])
    })
  })

  describe('getStickersByTeam', () => {
    it('returns only stickers for specified team', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validCatalog),
      })

      vi.resetModules()
      const { loadCatalog, getStickersByTeam } = await import('./catalog')

      const catalog = await loadCatalog()
      const argStickers = getStickersByTeam(catalog, 'ARG')

      expect(argStickers).toHaveLength(2)
      expect(argStickers.every((s) => s.team === 'ARG')).toBe(true)
    })

    it('returns empty array for non-existent team', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validCatalog),
      })

      vi.resetModules()
      const { loadCatalog, getStickersByTeam } = await import('./catalog')

      const catalog = await loadCatalog()
      const stickers = getStickersByTeam(catalog, 'XXX')

      expect(stickers).toHaveLength(0)
    })
  })
})
