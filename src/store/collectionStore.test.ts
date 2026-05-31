import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CollectionEntry } from '../data/types'

// ─── Mock DB module ───────────────────────────────────────────────────────────
// We test the DB layer by mocking the entire '../data/db' module.
// This avoids any IndexedDB initialization issues in the jsdom environment.

const mockUpsertEntry = vi.fn()
const mockDeleteEntry = vi.fn()
const mockClearCollection = vi.fn()
const mockBulkUpsertEntries = vi.fn()
const mockGetAllEntries = vi.fn()
const mockGetMeta = vi.fn()
const mockUpsertMeta = vi.fn()
const mockGetEntry = vi.fn()

vi.mock('../data/db', () => ({
  getEntry: (...args: unknown[]) => mockGetEntry(...args),
  getAllEntries: (...args: unknown[]) => mockGetAllEntries(...args),
  upsertEntry: (...args: unknown[]) => mockUpsertEntry(...args),
  deleteEntry: (...args: unknown[]) => mockDeleteEntry(...args),
  clearCollection: (...args: unknown[]) => mockClearCollection(...args),
  bulkUpsertEntries: (...args: unknown[]) => mockBulkUpsertEntries(...args),
  getMeta: (...args: unknown[]) => mockGetMeta(...args),
  upsertMeta: (...args: unknown[]) => mockUpsertMeta(...args),
}))

// ─── Mock catalog ─────────────────────────────────────────────────────────────
// Note: all state inside vi.mock factory to avoid TDZ with hoisting

vi.mock('../data/catalog', () => {
  const catalogStickers = [
    { number: 1, name: 'Player One', team: 'ARG', countryCode: 'AR', position: 'player', image: 'arg-1.png' },
    { number: 2, name: 'Player Two', team: 'ARG', countryCode: 'AR', position: 'player', image: 'arg-2.png' },
    { number: 3, name: 'Player Three', team: 'BRA', countryCode: 'BR', position: 'player', image: 'bra-1.png' },
    { number: 6, name: 'Logo ARG', team: 'ARG', countryCode: 'AR', position: 'emblem', image: 'arg-emblem.png' },
  ]

  return {
    loadCatalog: vi.fn().mockResolvedValue({
      version: '1.0.0',
      total: 50,
      stickers: catalogStickers,
    }),
    getCatalog: vi.fn().mockReturnValue({
      version: '1.0.0',
      total: 50,
      stickers: catalogStickers,
    }),
    getStickerByNumber: vi.fn((n: number) =>
      catalogStickers.find((s: typeof catalogStickers[number]) => s.number === n),
    ),
    getTeams: vi.fn().mockReturnValue(['ARG', 'BRA']),
    getStickersByTeam: vi.fn((_catalog: { stickers: typeof catalogStickers }, team: string): typeof catalogStickers =>
      catalogStickers.filter((s: typeof catalogStickers[number]) => s.team === team),
    ),
  }
})

import { useCollectionStore } from './collectionStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildStore(initialEntries: CollectionEntry[] = []) {
  useCollectionStore.setState({
    entries: new Map(initialEntries.map((e) => [e.stickerNumber, e])),
    isLoading: false,
    error: null,
    filter: 'all',
    teamFilter: null,
    searchQuery: '',
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CollectionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsertEntry.mockResolvedValue(undefined)
    mockDeleteEntry.mockResolvedValue(undefined)
    mockClearCollection.mockResolvedValue(undefined)
    mockBulkUpsertEntries.mockResolvedValue(undefined)
  })

  describe('getCount', () => {
    it('returns 0 for sticker with no entry', () => {
      buildStore([])
      const count = useCollectionStore.getState().getCount(1)
      expect(count).toBe(0)
    })

    it('returns correct count for sticker with entry', () => {
      buildStore([{ stickerNumber: 5, count: 3, lastUpdated: Date.now() }])
      const count = useCollectionStore.getState().getCount(5)
      expect(count).toBe(3)
    })
  })

  describe('filtering', () => {
    it('setFilter updates filter state', () => {
      buildStore([])
      const { setFilter } = useCollectionStore.getState()
      setFilter('have')
      expect(useCollectionStore.getState().filter).toBe('have')
    })

    it('setTeamFilter updates teamFilter state', () => {
      buildStore([])
      const { setTeamFilter } = useCollectionStore.getState()
      setTeamFilter('ARG')
      expect(useCollectionStore.getState().teamFilter).toBe('ARG')
    })

    it('setSearchQuery updates searchQuery state', () => {
      buildStore([])
      const { setSearchQuery } = useCollectionStore.getState()
      setSearchQuery('messi')
      expect(useCollectionStore.getState().searchQuery).toBe('messi')
    })
  })

  describe('increment', () => {
    it('increases count for existing sticker', async () => {
      buildStore([{ stickerNumber: 10, count: 1, lastUpdated: Date.now() }])
      const { increment } = useCollectionStore.getState()

      await increment(10)

      expect(mockUpsertEntry).toHaveBeenCalledWith(10, 2)
      expect(useCollectionStore.getState().getCount(10)).toBe(2)
    })

    it('creates entry with count 1 for missing sticker', async () => {
      buildStore([])
      const { increment } = useCollectionStore.getState()

      await increment(99)

      expect(mockUpsertEntry).toHaveBeenCalledWith(99, 1)
      expect(useCollectionStore.getState().getCount(99)).toBe(1)
    })
  })

  describe('decrement', () => {
    it('reduces count', async () => {
      buildStore([{ stickerNumber: 7, count: 2, lastUpdated: Date.now() }])
      const { decrement } = useCollectionStore.getState()

      await decrement(7)

      expect(mockUpsertEntry).toHaveBeenCalledWith(7, 1)
      expect(useCollectionStore.getState().getCount(7)).toBe(1)
    })

    it('removes entry when count reaches 0', async () => {
      buildStore([{ stickerNumber: 8, count: 1, lastUpdated: Date.now() }])
      const { decrement } = useCollectionStore.getState()

      await decrement(8)

      expect(mockDeleteEntry).toHaveBeenCalledWith(8)
      expect(useCollectionStore.getState().getCount(8)).toBe(0)
    })

    it('does nothing when count is already 0', async () => {
      buildStore([])
      const { decrement } = useCollectionStore.getState()

      await decrement(999)

      expect(mockUpsertEntry).not.toHaveBeenCalled()
      expect(mockDeleteEntry).not.toHaveBeenCalled()
    })
  })

  describe('setCount', () => {
    it('removes entry when count is 0', async () => {
      buildStore([{ stickerNumber: 12, count: 5, lastUpdated: Date.now() }])
      const { setCount } = useCollectionStore.getState()

      await setCount(12, 0)

      expect(mockDeleteEntry).toHaveBeenCalledWith(12)
      expect(useCollectionStore.getState().getCount(12)).toBe(0)
    })

    it('sets exact count', async () => {
      buildStore([{ stickerNumber: 15, count: 2, lastUpdated: Date.now() }])
      const { setCount } = useCollectionStore.getState()

      await setCount(15, 7)

      expect(mockUpsertEntry).toHaveBeenCalledWith(15, 7)
      expect(useCollectionStore.getState().getCount(15)).toBe(7)
    })
  })

  describe('resetAll', () => {
    it('clears all entries', async () => {
      buildStore([
        { stickerNumber: 1, count: 2, lastUpdated: Date.now() },
        { stickerNumber: 3, count: 1, lastUpdated: Date.now() },
      ])
      const { resetAll } = useCollectionStore.getState()

      await resetAll()

      expect(mockClearCollection).toHaveBeenCalled()
      expect(useCollectionStore.getState().entries.size).toBe(0)
    })
  })

  describe('exportData', () => {
    it('returns array of all entries', async () => {
      buildStore([
        { stickerNumber: 2, count: 4, lastUpdated: Date.now() },
        { stickerNumber: 5, count: 1, lastUpdated: Date.now() },
      ])
      const { exportData } = useCollectionStore.getState()

      const result = await exportData()

      expect(result).toHaveLength(2)
      expect(result.map((e) => e.stickerNumber).sort()).toEqual([2, 5])
    })
  })

  describe('team progress', () => {
    it('getTeamProgress returns teams from catalog', () => {
      buildStore([])
      const progress = useCollectionStore.getState().getTeamProgress()
      expect(progress.length).toBeGreaterThan(0)
      expect(progress[0]).toMatchObject({
        team: expect.any(String),
        total: expect.any(Number),
        have: expect.any(Number),
        missing: expect.any(Number),
        duplicates: expect.any(Number),
        progress: expect.any(Number),
      })
    })
  })

  describe('stats', () => {
    it('getStats returns stats with total from catalog', () => {
      buildStore([])
      const stats = useCollectionStore.getState().getStats()
      expect(stats.total).toBeGreaterThan(0)
      expect(stats).toMatchObject({
        have: expect.any(Number),
        missing: expect.any(Number),
        duplicateCount: expect.any(Number),
      })
    })
  })
})
