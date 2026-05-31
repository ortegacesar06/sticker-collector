import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  getEntry,
  getAllEntries,
  upsertEntry,
  deleteEntry,
  clearCollection,
  bulkUpsertEntries,
  getMeta,
  upsertMeta,
} from './db'
import type { CollectionEntry } from './types'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Dexie CRUD helpers', () => {
  beforeEach(async () => {
    // Clear DB between tests
    await clearCollection()
  })

  // Note: fake-indexeddb/auto handles DB initialization automatically.
  // Each test starts with a fresh DB via beforeEach.

  describe('getEntry', () => {
    it('returns undefined when entry does not exist', async () => {
      const result = await getEntry(999)
      expect(result).toBeUndefined()
    })

    it('returns the entry after upserting', async () => {
      await upsertEntry(5, 3)

      const result = await getEntry(5)

      expect(result).toMatchObject({ stickerNumber: 5, count: 3 })
    })
  })

  describe('getAllEntries', () => {
    it('returns empty array initially', async () => {
      const result = await getAllEntries()
      expect(result).toEqual([])
    })

    it('returns all upserted entries', async () => {
      await upsertEntry(100, 2)
      await upsertEntry(101, 1)

      const result = await getAllEntries()
      const numbers = result.map((e) => e.stickerNumber).sort()

      expect(numbers).toContain(100)
      expect(numbers).toContain(101)
    })
  })

  describe('upsertEntry', () => {
    it('stores entry with correct count', async () => {
      await upsertEntry(7, 4)

      const result = await getEntry(7)
      expect(result).toMatchObject({ stickerNumber: 7, count: 4 })
    })

    it('updates lastUpdated timestamp', async () => {
      const before = Date.now() - 1000
      await upsertEntry(10, 1)

      const result = await getEntry(10)
      expect(result!.lastUpdated).toBeGreaterThanOrEqual(before)
    })

    it('overwrites existing count', async () => {
      await upsertEntry(12, 5)
      await upsertEntry(12, 2)

      const result = await getEntry(12)
      expect(result).toMatchObject({ stickerNumber: 12, count: 2 })
    })
  })

  describe('deleteEntry', () => {
    it('removes entry from DB', async () => {
      await upsertEntry(8, 1)
      await deleteEntry(8)

      const result = await getEntry(8)
      expect(result).toBeUndefined()
    })

    it('does not error when entry does not exist', async () => {
      await expect(deleteEntry(999)).resolves.toBeUndefined()
    })
  })

  describe('clearCollection', () => {
    it('removes all entries', async () => {
      await upsertEntry(1, 1)
      await upsertEntry(2, 2)
      await upsertEntry(3, 3)

      await clearCollection()

      const result = await getAllEntries()
      expect(result).toEqual([])
    })
  })

  describe('bulkUpsertEntries', () => {
    it('inserts all entries', async () => {
      const entries: CollectionEntry[] = [
        { stickerNumber: 10, count: 2, lastUpdated: Date.now() },
        { stickerNumber: 11, count: 1, lastUpdated: Date.now() },
      ]

      await bulkUpsertEntries(entries)

      const result = await getAllEntries()
      expect(result).toHaveLength(2)
      expect(result.map((e) => e.stickerNumber).sort()).toEqual([10, 11])
    })

    it('overwrites existing entries', async () => {
      await upsertEntry(5, 1)
      const entries: CollectionEntry[] = [
        { stickerNumber: 5, count: 9, lastUpdated: Date.now() },
      ]

      await bulkUpsertEntries(entries)

      const result = await getEntry(5)
      expect(result).toMatchObject({ stickerNumber: 5, count: 9 })
    })
  })

  describe('getMeta', () => {
    it('returns undefined when no meta exists', async () => {
      const result = await getMeta()
      expect(result).toBeUndefined()
    })

    it('returns meta after upserting', async () => {
      await upsertMeta({ theme: 'dark', lastBackupAt: 12345 })

      const result = await getMeta()

      expect(result).toMatchObject({ id: 'meta', theme: 'dark', lastBackupAt: 12345 })
    })
  })

  describe('upsertMeta', () => {
    it('creates meta with given fields', async () => {
      await upsertMeta({ lastBackupAt: 999 })

      const result = await getMeta()
      expect(result).toMatchObject({ id: 'meta', lastBackupAt: 999 })
    })

    it('merges with existing meta', async () => {
      await upsertMeta({ theme: 'light' })
      await upsertMeta({ lastBackupAt: 555 })

      const result = await getMeta()
      expect(result).toMatchObject({ theme: 'light', lastBackupAt: 555 })
    })
  })
})
