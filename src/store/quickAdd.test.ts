import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CollectionEntry } from '../data/types'

// ─── Mock DB module ───────────────────────────────────────────────────────────

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
// Note: catalogStickers is declared inside the factory to avoid TDZ with hoisting

vi.mock('../data/catalog', () => {
  const catalogStickers = [
    { number: 1, name: 'Player One', team: 'ARG', countryCode: 'AR', position: 'player', image: 'arg-1.png', page: 1 },
    { number: 2, name: 'Player Two', team: 'ARG', countryCode: 'AR', position: 'player', image: 'arg-2.png', page: 1 },
    { number: 3, name: 'Player Three', team: 'BRA', countryCode: 'BR', position: 'player', image: 'bra-1.png', page: 2 },
    { number: 4, name: 'Player Four', team: 'BRA', countryCode: 'BR', position: 'player', image: 'bra-2.png', page: 2 },
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
    quickAddMode: false,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Quick-Add Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsertEntry.mockResolvedValue(undefined)
    mockDeleteEntry.mockResolvedValue(undefined)
    mockClearCollection.mockResolvedValue(undefined)
    mockBulkUpsertEntries.mockResolvedValue(undefined)
  })

  describe('quickAddMode state', () => {
    it('default is false', () => {
      buildStore()
      expect(useCollectionStore.getState().quickAddMode).toBe(false)
    })

    it('setQuickAddMode toggles the state', () => {
      buildStore()
      const { setQuickAddMode } = useCollectionStore.getState()
      setQuickAddMode(true)
      expect(useCollectionStore.getState().quickAddMode).toBe(true)
      setQuickAddMode(false)
      expect(useCollectionStore.getState().quickAddMode).toBe(false)
    })
  })

  describe('increment in quick-add mode', () => {
    it('increments count and persists to Dexie', async () => {
      buildStore([])
      const { increment } = useCollectionStore.getState()

      await increment(1)

      expect(mockUpsertEntry).toHaveBeenCalledWith(1, 1)
      expect(useCollectionStore.getState().getCount(1)).toBe(1)
    })

    it('works for missing sticker (creates entry with count 1)', async () => {
      buildStore([])
      const { increment } = useCollectionStore.getState()

      await increment(99)

      expect(mockUpsertEntry).toHaveBeenCalledWith(99, 1)
      expect(useCollectionStore.getState().getCount(99)).toBe(1)
    })
  })

  describe('decrement in quick-add mode', () => {
    it('decrements count and persists to Dexie', async () => {
      buildStore([{ stickerNumber: 1, count: 2, lastUpdated: Date.now() }])
      const { decrement } = useCollectionStore.getState()

      await decrement(1)

      expect(mockUpsertEntry).toHaveBeenCalledWith(1, 1)
      expect(useCollectionStore.getState().getCount(1)).toBe(1)
    })

    it('removes entry when count reaches 0', async () => {
      buildStore([{ stickerNumber: 1, count: 1, lastUpdated: Date.now() }])
      const { decrement } = useCollectionStore.getState()

      await decrement(1)

      expect(mockDeleteEntry).toHaveBeenCalledWith(1)
      expect(useCollectionStore.getState().getCount(1)).toBe(0)
    })
  })

  describe('setZero', () => {
    it('removes entry from store and Dexie', async () => {
      buildStore([{ stickerNumber: 5, count: 3, lastUpdated: Date.now() }])
      const { setZero } = useCollectionStore.getState()

      await setZero(5)

      expect(mockDeleteEntry).toHaveBeenCalledWith(5)
      expect(useCollectionStore.getState().getCount(5)).toBe(0)
    })

    it('does nothing when sticker has no entry', async () => {
      buildStore([])
      const { setZero } = useCollectionStore.getState()

      await setZero(999)

      expect(mockDeleteEntry).not.toHaveBeenCalled()
    })
  })
})

describe('Dexie Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsertEntry.mockResolvedValue(undefined)
    mockDeleteEntry.mockResolvedValue(undefined)
  })

  it('increment calls upsertEntry immediately', async () => {
    buildStore([])
    const { increment } = useCollectionStore.getState()

    await increment(2)

    expect(mockUpsertEntry).toHaveBeenCalledTimes(1)
    expect(mockUpsertEntry).toHaveBeenCalledWith(2, 1)
  })

  it('decrement calls upsertEntry or deleteEntry immediately', async () => {
    buildStore([{ stickerNumber: 2, count: 2, lastUpdated: Date.now() }])
    const { decrement } = useCollectionStore.getState()

    await decrement(2)

    expect(mockUpsertEntry).toHaveBeenCalledWith(2, 1)
  })

  it('setCount persists immediately', async () => {
    buildStore([])
    const { setCount } = useCollectionStore.getState()

    await setCount(3, 5)

    expect(mockUpsertEntry).toHaveBeenCalledWith(3, 5)
  })

  it('setZero persists immediately (deleteEntry)', async () => {
    buildStore([{ stickerNumber: 4, count: 1, lastUpdated: Date.now() }])
    const { setZero } = useCollectionStore.getState()

    await setZero(4)

    expect(mockDeleteEntry).toHaveBeenCalledWith(4)
  })

  it('loadFromDexie populates entries from IndexedDB', async () => {
    mockGetAllEntries.mockResolvedValue([
      { stickerNumber: 1, count: 3, lastUpdated: Date.now() },
      { stickerNumber: 2, count: 1, lastUpdated: Date.now() },
    ])

    buildStore([])
    const { loadFromDexie } = useCollectionStore.getState()

    await loadFromDexie()

    expect(useCollectionStore.getState().getCount(1)).toBe(3)
    expect(useCollectionStore.getState().getCount(2)).toBe(1)
  })
})

describe('Adjacent Sticker Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsertEntry.mockResolvedValue(undefined)
  })

  it('getAdjacentStickerNumbers returns prev and next for middle sticker', () => {
    buildStore([])
    const { getAdjacentStickerNumbers } = useCollectionStore.getState()

    const adj = getAdjacentStickerNumbers(2)

    expect(adj.prev).toBe(1)
    expect(adj.next).toBe(3)
  })

  it('getAdjacentStickerNumbers returns prev=null for first sticker', () => {
    buildStore([])
    const { getAdjacentStickerNumbers } = useCollectionStore.getState()

    const adj = getAdjacentStickerNumbers(1)

    expect(adj.prev).toBe(null)
    expect(adj.next).toBe(2)
  })

  it('getAdjacentStickerNumbers returns next=null for last sticker', () => {
    buildStore([])
    const { getAdjacentStickerNumbers } = useCollectionStore.getState()

    const adj = getAdjacentStickerNumbers(4)

    expect(adj.prev).toBe(3)
    expect(adj.next).toBe(null)
  })

  it('getAdjacentStickerNumbers returns nulls for non-existent sticker', () => {
    buildStore([])
    const { getAdjacentStickerNumbers } = useCollectionStore.getState()

    const adj = getAdjacentStickerNumbers(999)

    expect(adj.prev).toBe(null)
    expect(adj.next).toBe(null)
  })
})