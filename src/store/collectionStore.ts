import { create } from 'zustand'
import type { CollectionEntry, FilterType, TeamProgress } from '../data/types'
import { getAllEntries, upsertEntry, deleteEntry, clearCollection, bulkUpsertEntries } from '../data/db'
import { getCatalog, getTeams, getStickersByTeam } from '../data/catalog'

// ─── State ───────────────────────────────────────────────────────────────────

interface CollectionState {
  entries: Map<number, CollectionEntry>
  isLoading: boolean
  error: string | null
  filter: FilterType
  teamFilter: string | null
  searchQuery: string
  quickAddMode: boolean

  // Actions
  loadFromDexie: () => Promise<void>
  increment: (stickerNumber: number) => Promise<void>
  decrement: (stickerNumber: number) => Promise<void>
  setCount: (stickerNumber: number, count: number) => Promise<void>
  setZero: (stickerNumber: number) => Promise<void>
  resetAll: () => Promise<void>
  exportData: () => Promise<CollectionEntry[]>
  importData: (entries: CollectionEntry[], mode: 'merge' | 'replace') => Promise<void>
  setFilter: (filter: FilterType) => void
  setTeamFilter: (team: string | null) => void
  setSearchQuery: (query: string) => void
  setQuickAddMode: (enabled: boolean) => void

  // Computed (not stored)
  getCount: (stickerNumber: number) => number
  getFilteredNumbers: () => number[]
  getTeamProgress: () => TeamProgress[]
  getStats: () => { total: number; have: number; missing: number; duplicates: number; duplicateCount: number }
  getAdjacentStickerNumbers: (stickerNumber: number) => { prev: number | null; next: number | null }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCollectionStore = create<CollectionState>((set, get) => ({
  entries: new Map(),
  isLoading: false,
  error: null,
  filter: 'all',
  teamFilter: null,
  searchQuery: '',
  quickAddMode: false,

  // ── Persistence ────────────────────────────────────────────────────────────

  loadFromDexie: async () => {
    set({ isLoading: true, error: null })
    try {
      const rows = await getAllEntries()
      const entries = new Map(rows.map((r) => [r.stickerNumber, r]))
      set({ entries, isLoading: false })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  increment: async (stickerNumber) => {
    const current = get().getCount(stickerNumber)
    await upsertEntry(stickerNumber, current + 1)
    set((s) => {
      const entries = new Map(s.entries)
      entries.set(stickerNumber, { stickerNumber, count: current + 1, lastUpdated: Date.now() })
      return { entries }
    })
  },

  decrement: async (stickerNumber) => {
    const current = get().getCount(stickerNumber)
    if (current <= 0) return
    if (current === 1) {
      await deleteEntry(stickerNumber)
      set((s) => {
        const entries = new Map(s.entries)
        entries.delete(stickerNumber)
        return { entries }
      })
    } else {
      await upsertEntry(stickerNumber, current - 1)
      set((s) => {
        const entries = new Map(s.entries)
        entries.set(stickerNumber, { stickerNumber, count: current - 1, lastUpdated: Date.now() })
        return { entries }
      })
    }
  },

  setCount: async (stickerNumber, count) => {
    if (count <= 0) {
      await deleteEntry(stickerNumber)
      set((s) => {
        const entries = new Map(s.entries)
        entries.delete(stickerNumber)
        return { entries }
      })
    } else {
      await upsertEntry(stickerNumber, count)
      set((s) => {
        const entries = new Map(s.entries)
        entries.set(stickerNumber, { stickerNumber, count, lastUpdated: Date.now() })
        return { entries }
      })
    }
  },

  setZero: async (stickerNumber) => {
    const current = get().getCount(stickerNumber)
    if (current === 0) return
    await deleteEntry(stickerNumber)
    set((s) => {
      const entries = new Map(s.entries)
      entries.delete(stickerNumber)
      return { entries }
    })
  },

  resetAll: async () => {
    await clearCollection()
    set({ entries: new Map() })
  },

  exportData: async () => {
    return Array.from(get().entries.values())
  },

  importData: async (entries, mode) => {
    if (mode === 'replace') {
      await clearCollection()
      set({ entries: new Map() })
    }
    await bulkUpsertEntries(entries)
    await get().loadFromDexie()
  },

  // ── Filters ────────────────────────────────────────────────────────────────

  setFilter: (filter) => set({ filter }),
  setTeamFilter: (team) => set({ teamFilter: team }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setQuickAddMode: (enabled) => set({ quickAddMode: enabled }),

  // ── Computed ──────────────────────────────────────────────────────────────

  getCount: (stickerNumber) => {
    return get().entries.get(stickerNumber)?.count ?? 0
  },

  getFilteredNumbers: () => {
    const catalog = getCatalog()
    if (!catalog) return []

    const { filter, teamFilter, searchQuery } = get()
    let stickers = catalog.stickers

    if (teamFilter) {
      stickers = stickers.filter((s) => s.team === teamFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      stickers = stickers.filter(
        (s) =>
          String(s.number).includes(q) ||
          s.name.toLowerCase().includes(q),
      )
    }

    const result: number[] = []
    for (const s of stickers) {
      const count = get().getCount(s.number)
      if (filter === 'all') {
        result.push(s.number)
      } else if (filter === 'have' && count > 0) {
        result.push(s.number)
      } else if (filter === 'missing' && count === 0) {
        result.push(s.number)
      } else if (filter === 'duplicates' && count > 1) {
        result.push(s.number)
      }
    }
    return result
  },

  getTeamProgress: () => {
    const catalog = getCatalog()
    if (!catalog) return []

    const teams = getTeams(catalog)
    return teams.map((team) => {
      const teamStickers = getStickersByTeam(catalog, team)
      const total = teamStickers.length
      let have = 0
      let missing = 0
      let duplicates = 0

      for (const s of teamStickers) {
        const count = get().getCount(s.number)
        if (count === 0) missing++
        else if (count === 1) have++
        else { have++; duplicates += count - 1 }
      }

      return {
        team,
        total,
        have,
        missing,
        duplicates,
        progress: total > 0 ? Math.round((have / total) * 100) : 0,
      }
    })
  },

  getStats: () => {
    const catalog = getCatalog()
    if (!catalog) return { total: 0, have: 0, missing: 0, duplicates: 0, duplicateCount: 0 }

    let have = 0
    let missing = 0
    let duplicateCount = 0

    for (const s of catalog.stickers) {
      const count = get().getCount(s.number)
      if (count === 0) missing++
      else {
        have++
        if (count > 1) duplicateCount += count - 1
      }
    }

    return {
      total: catalog.stickers.length,
      have,
      missing,
      duplicates: have - catalog.stickers.length + missing, // stickers with count > 1
      duplicateCount,
    }
  },

  getAdjacentStickerNumbers: (stickerNumber) => {
    const catalog = getCatalog()
    if (!catalog) return { prev: null, next: null }

    const stickerNumbers = catalog.stickers.map((s) => s.number).sort((a, b) => a - b)
    const idx = stickerNumbers.indexOf(stickerNumber)

    if (idx === -1) return { prev: null, next: null }

    return {
      prev: idx > 0 ? stickerNumbers[idx - 1] : null,
      next: idx < stickerNumbers.length - 1 ? stickerNumbers[idx + 1] : null,
    }
  },
}))
