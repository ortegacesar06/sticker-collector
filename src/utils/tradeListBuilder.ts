import type { TradeListItem } from '../data/types'

export type SortMode = 'team' | 'count'

/**
 * Build the "Tengo/Busco" trade list text from duplicate and missing stickers.
 *
 * Format:
 *   Tengo (repes): ARG-3, BRA-12×2, ... | Busco: ARG-7, USA-2, ...
 *
 * Sticker references use TEAM-NUMBER format. When count > 1, adds ×N suffix
 * to indicate how many spares ("sobran N-1").
 */
export function buildTradeListText(
  duplicateItems: TradeListItem[],
  missingItems: TradeListItem[],
): string {
  const formatItems = (items: TradeListItem[], excessSuffix: boolean): string => {
    return items
      .sort((a, b) => a.team.localeCompare(b.team) || a.stickerNumber - b.stickerNumber)
      .map((item) => {
        const label = `${item.team}-${item.stickerNumber}`
        if (excessSuffix && item.count > 1) {
          return `${label}×${item.count}`
        }
        return label
      })
      .join(', ')
  }

  const tengo = duplicateItems.length > 0 ? formatItems(duplicateItems, true) : '—'
  const busco = missingItems.length > 0 ? formatItems(missingItems, false) : '—'

  return `Tengo (repes): ${tengo} | Busco: ${busco}`
}

/**
 * Build "Tengo N" / "Busco N" short labels for display.
 */
export function buildShortSummary(
  duplicateCount: number,
  missingCount: number,
): { tengoLabel: string; buscoLabel: string } {
  return {
    tengoLabel: duplicateCount > 0 ? `Tengo ${duplicateCount}` : 'Sin repetidas',
    buscoLabel: missingCount > 0 ? `Busco ${missingCount}` : 'Album completo',
  }
}

/**
 * Return teams that need only 1 or 2 more stickers.
 */
export function findNearlyCompleteTeams(
  teamProgress: { team: string; missing: number }[],
): { team: string; missing: number }[] {
  return teamProgress
    .filter((t) => t.missing > 0 && t.missing <= 2)
    .sort((a, b) => a.missing - b.missing)
}