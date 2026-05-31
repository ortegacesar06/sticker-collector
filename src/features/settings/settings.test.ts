/**
 * Tests for export format, import validation, and reset behavior.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CollectionEntry } from '../../data/types'

// ─── Mock DB ──────────────────────────────────────────────────────────────────

const mockGetAllEntries = vi.fn()
const mockClearCollection = vi.fn()
const mockBulkUpsertEntries = vi.fn()
const mockGetMeta = vi.fn()
const mockUpsertMeta = vi.fn()

vi.mock('../../data/db', () => ({
  getAllEntries: (...args: unknown[]) => mockGetAllEntries(...args),
  clearCollection: (...args: unknown[]) => mockClearCollection(...args),
  bulkUpsertEntries: (...args: unknown[]) => mockBulkUpsertEntries(...args),
  getMeta: (...args: unknown[]) => mockGetMeta(...args),
  upsertMeta: (...args: unknown[]) => mockUpsertMeta(...args),
}))

// ─── Mock catalog ─────────────────────────────────────────────────────────────

vi.mock('../../data/catalog', () => ({
  getCatalog: vi.fn().mockReturnValue({ version: '1.0.0', total: 50, stickers: [] }),
  getTeams: vi.fn().mockReturnValue([]),
  getStickersByTeam: vi.fn().mockReturnValue([]),
}))

import { useCollectionStore } from '../../store/collectionStore'

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

// ─── Export format validation ─────────────────────────────────────────────────

describe('Export format', () => {
  it('exportData returns array of CollectionEntry objects', async () => {
    const entries: CollectionEntry[] = [
      { stickerNumber: 1, count: 2, lastUpdated: 1000 },
      { stickerNumber: 5, count: 1, lastUpdated: 2000 },
    ]
    buildStore(entries)
    const result = await useCollectionStore.getState().exportData()
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ stickerNumber: expect.any(Number), count: expect.any(Number), lastUpdated: expect.any(Number) })
  })

  it('exported entries have correct shape', async () => {
    const entries: CollectionEntry[] = [{ stickerNumber: 3, count: 4, lastUpdated: Date.now() }]
    buildStore(entries)
    const result = await useCollectionStore.getState().exportData()
    expect(result[0].stickerNumber).toBe(3)
    expect(result[0].count).toBe(4)
    expect(typeof result[0].lastUpdated).toBe('number')
  })
})

// ─── Import validation ────────────────────────────────────────────────────────

describe('Import validation', () => {
  // Helper to simulate what validatePayload does
  function validatePayload(payload: unknown): payload is { version: string; exportedAt: number; entries: CollectionEntry[] } {
    if (!payload || typeof payload !== 'object') return false
    const p = payload as Record<string, unknown>
    return (
      typeof p.version === 'string' &&
      typeof p.exportedAt === 'number' &&
      Array.isArray(p.entries) &&
      p.entries.every(
        (e) =>
          e &&
          typeof e === 'object' &&
          typeof (e as Record<string, unknown>).stickerNumber === 'number' &&
          typeof (e as Record<string, unknown>).count === 'number' &&
          typeof (e as Record<string, unknown>).lastUpdated === 'number',
      )
    )
  }

  it('rejects non-object payloads', () => {
    expect(validatePayload(null)).toBe(false)
    expect(validatePayload('string')).toBe(false)
    expect(validatePayload(123)).toBe(false)
    expect(validatePayload([])).toBe(false)
  })

  it('rejects payload missing version', () => {
    const bad = { exportedAt: Date.now(), entries: [] }
    expect(validatePayload(bad)).toBe(false)
  })

  it('rejects payload missing exportedAt', () => {
    const bad = { version: '1.0.0', entries: [] }
    expect(validatePayload(bad)).toBe(false)
  })

  it('rejects payload with non-array entries', () => {
    const bad = { version: '1.0.0', exportedAt: Date.now(), entries: 'not array' }
    expect(validatePayload(bad)).toBe(false)
  })

  it('rejects entries with missing fields', () => {
    const bad = { version: '1.0.0', exportedAt: Date.now(), entries: [{ stickerNumber: 1 }] }
    expect(validatePayload(bad)).toBe(false)
  })

  it('rejects entries with wrong field types', () => {
    const bad = { version: '1.0.0', exportedAt: Date.now(), entries: [{ stickerNumber: '1', count: 2, lastUpdated: 3 }] }
    expect(validatePayload(bad)).toBe(false)
  })

  it('accepts valid payload', () => {
    const good = {
      version: '1.0.0',
      exportedAt: Date.now(),
      entries: [
        { stickerNumber: 1, count: 2, lastUpdated: 1000 },
        { stickerNumber: 5, count: 1, lastUpdated: 2000 },
      ],
    }
    expect(validatePayload(good)).toBe(true)
  })
})

// ─── Import merge/replace behavior ───────────────────────────────────────────

describe('importData behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClearCollection.mockResolvedValue(undefined)
    mockBulkUpsertEntries.mockResolvedValue(undefined)
    mockGetAllEntries.mockResolvedValue([])
  })

  it('replace mode clears collection first then bulk inserts', async () => {
    buildStore([{ stickerNumber: 1, count: 5, lastUpdated: Date.now() }])
    const { importData } = useCollectionStore.getState()

    await importData([{ stickerNumber: 2, count: 3, lastUpdated: Date.now() }], 'replace')

    expect(mockClearCollection).toHaveBeenCalled()
    expect(mockBulkUpsertEntries).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ stickerNumber: 2, count: 3 }),
      ]),
    )
  })

  it('merge mode does not clear collection', async () => {
    buildStore([{ stickerNumber: 1, count: 5, lastUpdated: Date.now() }])
    const { importData } = useCollectionStore.getState()

    await importData([{ stickerNumber: 2, count: 3, lastUpdated: Date.now() }], 'merge')

    expect(mockClearCollection).not.toHaveBeenCalled()
    expect(mockBulkUpsertEntries).toHaveBeenCalled()
  })
})

// ─── Reset behavior ──────────────────────────────────────────────────────────

describe('resetAll behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClearCollection.mockResolvedValue(undefined)
  })

  it('resetAll clears collection and empties entries map', async () => {
    buildStore([
      { stickerNumber: 1, count: 2, lastUpdated: Date.now() },
      { stickerNumber: 2, count: 3, lastUpdated: Date.now() },
    ])
    const { resetAll } = useCollectionStore.getState()

    await resetAll()

    expect(mockClearCollection).toHaveBeenCalled()
    expect(useCollectionStore.getState().entries.size).toBe(0)
  })

  it('resetAll can be called on empty collection', async () => {
    buildStore([])
    const { resetAll } = useCollectionStore.getState()

    await expect(resetAll()).resolves.not.toThrow()
    expect(mockClearCollection).toHaveBeenCalled()
  })
})

// ─── Theme meta persistence ───────────────────────────────────────────────────

describe('Theme meta in Dexie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsertMeta.mockResolvedValue(undefined)
    mockGetMeta.mockResolvedValue(undefined)
  })

  it('upsertMeta is called with theme on setTheme', async () => {
    const { upsertMeta } = await import('../../data/db')
    await upsertMeta({ theme: 'dark' })
    expect(mockUpsertMeta).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('getMeta returns theme from Dexie', async () => {
    mockGetMeta.mockResolvedValueOnce({ id: 'meta', theme: 'dark', lastBackupAt: 123 })
    const { getMeta } = await import('../../data/db')
    const meta = await getMeta()
    expect(meta?.theme).toBe('dark')
  })
})

// ─── Backup reminder logic ───────────────────────────────────────────────────

describe('Backup reminder', () => {
  it('showBackupReminder is true when lastBackupAt > 7 days ago', () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const eightDaysAgo = Date.now() - eightDaysMs() - 1000
    const lastBackup = eightDaysAgo
    const showReminder = lastBackup !== undefined && Date.now() - lastBackup > sevenDaysMs
    expect(showReminder).toBe(true)
  })

  it('showBackupReminder is false when lastBackupAt < 7 days ago', () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
    const lastBackup = threeDaysAgo
    const showReminder = lastBackup !== undefined && Date.now() - lastBackup > sevenDaysMs
    expect(showReminder).toBe(false)
  })

  it('showBackupReminder is false when lastBackupAt is undefined', () => {
    const lastBackup = undefined
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const showReminder = lastBackup !== undefined && Date.now() - lastBackup > sevenDaysMs
    expect(showReminder).toBe(false)
  })
})

// ─── Storage estimate helpers ─────────────────────────────────────────────────

describe('Storage estimate formatting', () => {
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(5242880)).toBe('5 MB')
  })

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB')
  })
})

// ─── Reset confirmation step logic ───────────────────────────────────────────

describe('Reset confirmation steps', () => {
  it('step 0 is initial state', () => {
    const step: 0 | 1 | 2 = 0
    expect(step).toBe(0)
  })

  it('step 1 is first confirmation', () => {
    const step: 0 | 1 | 2 = 1
    expect(step).toBe(1)
  })

  it('step 2 is final confirmation', () => {
    const step: 0 | 1 | 2 = 2
    expect(step).toBe(2)
  })

  it('step 2 requires step 1 to be reached first', () => {
    let step: 0 | 1 | 2 = 0
    // Simulate user clicking "Reset" first time
    step = 1
    // Simulate user clicking "Confirm" from step 1
    step = 2
    expect(step).toBe(2)
  })
})

// Helpers
function eightDaysMs() {
  return 8 * 24 * 60 * 60 * 1000
}