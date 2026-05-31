import { useCollectionStore } from '../store/collectionStore'
import { getCatalog, getTeams } from '../data/catalog'
import type { FilterType } from '../data/types'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'have', label: 'Have' },
  { value: 'missing', label: 'Missing' },
  { value: 'duplicates', label: 'Repes' },
]

export function FilterBar() {
  const filter = useCollectionStore((s) => s.filter)
  const teamFilter = useCollectionStore((s) => s.teamFilter)
  const searchQuery = useCollectionStore((s) => s.searchQuery)
  const setFilter = useCollectionStore((s) => s.setFilter)
  const setTeamFilter = useCollectionStore((s) => s.setTeamFilter)
  const setSearchQuery = useCollectionStore((s) => s.setSearchQuery)

  const catalog = getCatalog()
  const teams = catalog ? getTeams(catalog) : []

  return (
    <div className="flex flex-col gap-2 p-3 border-b border-surface bg-bg">
      <div className="flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.value
                ? 'bg-accent text-white'
                : 'bg-surface text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          value={teamFilter ?? ''}
          onChange={(e) => setTeamFilter(e.target.value || null)}
          className="px-3 py-1.5 rounded-lg bg-surface text-sm text-ink border-0 flex-1"
        >
          <option value="">All Teams</option>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="px-3 py-1.5 rounded-lg bg-surface text-sm text-ink border-0 w-36"
        />
      </div>
    </div>
  )
}
