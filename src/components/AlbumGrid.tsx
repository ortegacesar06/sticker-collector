import { useMemo } from 'react'
import { useCollectionStore } from '../store/collectionStore'
import { getCatalog, getTeams } from '../data/catalog'
import { StickerCell } from './StickerCell'

export function AlbumGrid() {
  const catalog = getCatalog()
  const getFilteredNumbers = useCollectionStore((s) => s.getFilteredNumbers)
  const teams = useMemo(() => catalog ? getTeams(catalog) : [], [catalog])

  if (!catalog) {
    return <div className="p-4 text-missing">No catalog loaded</div>
  }

  const filteredNumbers = getFilteredNumbers()
  const filteredSet = new Set(filteredNumbers)

  return (
    <div className="p-2">
      {teams.map((team) => {
        const teamStickers = catalog.stickers.filter((s) => s.team === team)
        const hasVisible = teamStickers.some((s) => filteredSet.has(s.number))
        if (!hasVisible && filteredNumbers.length > 0) return null

        return (
          <div key={team} className="mb-6">
            <h2 className="text-sm font-bold text-ink px-1 mb-2 uppercase tracking-wider">
              {team} ({teamStickers.length})
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {teamStickers.map((sticker) => (
                <StickerCell key={sticker.number} sticker={sticker} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
