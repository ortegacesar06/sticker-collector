import Dexie, { type Table } from 'dexie'
import type { CollectionEntry, CollectionMeta } from './types'

export class StickerDB extends Dexie {
  collection!: Table<CollectionEntry, number>
  meta!: Table<CollectionMeta, string>

  constructor() {
    super('mundial-2026-stickers')
    this.version(1).stores({
      collection: 'stickerNumber, lastUpdated',
      meta: 'id',
    })
  }
}

export const db = new StickerDB()

// ─── CRUD Helpers ─────────────────────────────────────────────────────────────

export async function getEntry(stickerNumber: number): Promise<CollectionEntry | undefined> {
  return db.collection.get(stickerNumber)
}

export async function getAllEntries(): Promise<CollectionEntry[]> {
  return db.collection.toArray()
}

export async function upsertEntry(stickerNumber: number, count: number): Promise<void> {
  await db.collection.put({ stickerNumber, count, lastUpdated: Date.now() })
}

export async function deleteEntry(stickerNumber: number): Promise<void> {
  await db.collection.delete(stickerNumber)
}

export async function clearCollection(): Promise<void> {
  await db.collection.clear()
}

export async function bulkUpsertEntries(entries: CollectionEntry[]): Promise<void> {
  const now = Date.now()
  await db.collection.bulkPut(
    entries.map((e) => ({ ...e, lastUpdated: now })),
  )
}

export async function getMeta(): Promise<CollectionMeta | undefined> {
  return db.meta.get('meta')
}

export async function upsertMeta(meta: Partial<CollectionMeta>): Promise<void> {
  const existing = await getMeta()
  await db.meta.put({ id: 'meta', ...existing, ...meta })
}
