import { useState } from 'react'
import { useCollectionStore } from '../../store/collectionStore'
import { getCatalog, getStickerByNumber } from '../../data/catalog'
import type { TradeListItem } from '../../data/types'
import { buildTradeListText } from '../../utils/tradeListBuilder'
import { ShareButton } from '../../components/ShareButton'

type SortMode = 'team' | 'count'

export default function RepesPage() {
  const [sortMode, setSortMode] = useState<SortMode>('team')
  const getCount = useCollectionStore((s) => s.getCount)

  const catalog = getCatalog()
  if (!catalog) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-missing">Catalogo no disponible</p>
      </div>
    )
  }

  const duplicateStickers: TradeListItem[] = []
  const missingStickers: TradeListItem[] = []

  for (const sticker of catalog.stickers) {
    const count = getCount(sticker.number)
    if (count > 1) {
      duplicateStickers.push({ stickerNumber: sticker.number, name: sticker.name, team: sticker.team, count })
    } else if (count === 0) {
      missingStickers.push({ stickerNumber: sticker.number, name: sticker.name, team: sticker.team, count: 0 })
    }
  }

  const sortedDuplicates = [...duplicateStickers].sort((a, b) => {
    if (sortMode === 'team') {
      const teamCmp = a.team.localeCompare(b.team)
      if (teamCmp !== 0) return teamCmp
      return a.stickerNumber - b.stickerNumber
    } else {
      if (b.count !== a.count) return b.count - a.count
      return a.team.localeCompare(b.team)
    }
  })

  const tradeListText = buildTradeListText(duplicateStickers, missingStickers)
  const excessCount = duplicateStickers.reduce((sum, item) => sum + item.count - 1, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-surface">
        <div>
          <h1 className="text-lg font-semibold text-ink">Mis Repetidas</h1>
          <p className="text-sm text-missing" aria-live="polite">
            {duplicateStickers.length} sticker{duplicateStickers.length !== 1 ? 's' : ''} ({excessCount} sobran)
          </p>
        </div>
        <ShareButton text={tradeListText} label="Compartir" />
      </header>

      {/* Sort controls */}
      <div className="flex gap-2 px-4 py-2 border-b border-surface" role="group" aria-label="Sort options">
        <button
          type="button"
          onClick={() => setSortMode('team')}
          className={`px-3 py-2 rounded-full text-sm font-medium transition-colors touch-target ${
            sortMode === 'team' ? 'bg-accent text-white' : 'bg-surface text-ink'
          }`}
          aria-pressed={sortMode === 'team'}
        >
          Por equipo
        </button>
        <button
          type="button"
          onClick={() => setSortMode('count')}
          className={`px-3 py-2 rounded-full text-sm font-medium transition-colors touch-target ${
            sortMode === 'count' ? 'bg-accent text-white' : 'bg-surface text-ink'
          }`}
          aria-pressed={sortMode === 'count'}
        >
          Por cantidad
        </button>
      </div>

      {/* Sticker list */}
      <main className="flex-1 overflow-y-auto px-4 py-2" role="main" aria-label="Duplicate stickers">
        {sortedDuplicates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-missing text-center">No tenes Stickers repetidos todavia.</p>
            <p className="text-missing text-sm text-center">Los stickers con count &gt; 1 apareceran aqui.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 pb-4" aria-label="Duplicate sticker list">
            {sortedDuplicates.map((item) => {
              const sticker = getStickerByNumber(item.stickerNumber)
              const excess = item.count - 1
              return (
                <li
                  key={item.stickerNumber}
                  className="flex items-center justify-between rounded-xl bg-surface px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-accent">{item.team}</span>
                      <span className="text-lg font-bold text-ink">#{item.stickerNumber}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-ink">{sticker?.name ?? 'Unknown'}</span>
                      {sticker?.position && (
                        <span className="text-xs text-missing capitalize">{sticker.position}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-missing">
                      Tengo <span className="font-bold text-ink">{item.count}</span>
                    </span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white" aria-label={`${excess} extras`}>
                      {excess} sobran
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
