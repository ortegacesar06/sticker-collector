import { useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCollectionStore } from '../store/collectionStore'
import { getCatalog, getTeams } from '../data/catalog'
import { StickerCell } from './StickerCell'
import type { Sticker } from '../data/types'

const STICKERS_PER_ROW = 5
const ROW_HEIGHT = 120

interface TeamSection {
  team: string
  stickers: Sticker[]
  offsetRow: number
}

export function AlbumGrid() {
  const catalog = getCatalog()
  const getFilteredNumbers = useCollectionStore((s) => s.getFilteredNumbers)
  const parentRef = useRef<HTMLDivElement>(null)

  if (!catalog) {
    return <div className="p-4 text-missing" role="alert">No catalog loaded</div>
  }

  const teams = useMemo(() => getTeams(catalog), [catalog])
  const filteredNumbers = getFilteredNumbers()
  const filteredSet = new Set(filteredNumbers)

  const sections = useMemo<TeamSection[]>(() => {
    const result: TeamSection[] = []
    let currentRow = 0

    for (const team of teams) {
      const teamStickers = catalog.stickers.filter((s) => s.team === team)
      const hasVisible = teamStickers.some((s) => filteredSet.has(s.number))

      if (!hasVisible && filteredNumbers.length > 0) continue

      result.push({
        team,
        stickers: teamStickers,
        offsetRow: currentRow,
      })

      currentRow += 1 + Math.ceil(teamStickers.length / STICKERS_PER_ROW)
    }

    return result
  }, [teams, catalog, filteredSet, filteredNumbers.length])

  const totalRows = useMemo(() => {
    if (sections.length === 0) return 0
    const last = sections[sections.length - 1]
    const lastTeamRowCount = 1 + Math.ceil(last.stickers.length / STICKERS_PER_ROW)
    return last.offsetRow + lastTeamRowCount
  }, [sections])

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  const getSectionForRow = (rowIndex: number): TeamSection | null => {
    for (const section of sections) {
      const teamRowCount = 1 + Math.ceil(section.stickers.length / STICKERS_PER_ROW)
      if (rowIndex >= section.offsetRow && rowIndex < section.offsetRow + teamRowCount) {
        return section
      }
    }
    return null
  }

  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto p-2"
      role="region"
      aria-label="Sticker album grid"
      tabIndex={0}
    >
      <div
        style={{
          height: totalSize,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const section = getSectionForRow(virtualRow.index)
          if (!section) return null

          const isHeaderRow = virtualRow.index === section.offsetRow
          const stickerIndex = virtualRow.index - section.offsetRow - 1

          if (isHeaderRow) {
            return (
              <div
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm">
                  <h2 
                    className="text-sm font-bold text-ink px-1 py-1 uppercase tracking-wider team-header"
                    id={`team-header-${section.team}`}
                  >
                    {section.team} ({section.stickers.length})
                  </h2>
                </div>
              </div>
            )
          }

          const startIdx = stickerIndex * STICKERS_PER_ROW
          const endIdx = Math.min(startIdx + STICKERS_PER_ROW, section.stickers.length)
          const rowStickers = section.stickers.slice(startIdx, endIdx)

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              role="group"
              aria-labelledby={`team-header-${section.team}`}
            >
              <div className="grid grid-cols-5 gap-2 h-full">
                {rowStickers.map((sticker) => (
                  <StickerCell key={sticker.number} sticker={sticker} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
