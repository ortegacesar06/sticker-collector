import { describe, it, expect } from 'vitest'
import type { TradeListItem } from '../data/types'
import { buildTradeListText, buildShortSummary, findNearlyCompleteTeams } from './tradeListBuilder'

const makeItem = (stickerNumber: number, team: string, count: number): TradeListItem => ({
  stickerNumber,
  name: `Player ${stickerNumber}`,
  team,
  count,
})

describe('buildTradeListText', () => {
  it('formats duplicate items with ×N suffix', () => {
    const duplicates: TradeListItem[] = [
      makeItem(3, 'ARG', 2),
      makeItem(12, 'BRA', 3),
    ]
    const missing: TradeListItem[] = [makeItem(7, 'ARG', 1)]
    const result = buildTradeListText(duplicates, missing)

    expect(result).toContain('Tengo (repes): ARG-3×2, BRA-12×3')
    expect(result).toContain('Busco: ARG-7')
  })

  it('sorts items by team then number', () => {
    const duplicates: TradeListItem[] = [
      makeItem(5, 'BRA', 2),
      makeItem(2, 'ARG', 2),
      makeItem(8, 'ARG', 2),
    ]
    const missing: TradeListItem[] = []
    const result = buildTradeListText(duplicates, missing)

    // ARG items before BRA; ARG-2 before ARG-8
    expect(result).toContain('ARG-2')
    expect(result).toContain('ARG-8')
    const argIdx = result.indexOf('ARG')
    const braIdx = result.indexOf('BRA')
    expect(argIdx).toBeLessThan(braIdx)
  })

  it('shows em-dash when no items of a type', () => {
    const duplicates: TradeListItem[] = [makeItem(1, 'ARG', 2)]
    const missing: TradeListItem[] = []
    const result = buildTradeListText(duplicates, missing)

    expect(result).toContain('| Busco: —')
  })

  it('handles empty inputs gracefully', () => {
    const result = buildTradeListText([], [])
    expect(result).toContain('Tengo (repes): —')
    expect(result).toContain('Busco: —')
  })

  it('formats single items without suffix', () => {
    const duplicates: TradeListItem[] = [makeItem(4, 'ARG', 1)]
    const missing: TradeListItem[] = [makeItem(9, 'USA', 1)]
    const result = buildTradeListText(duplicates, missing)

    // count=1 means no excess, so no ×1 suffix
    expect(result).not.toContain('×1')
  })
})

describe('buildShortSummary', () => {
  it('returns correct labels with counts', () => {
    const result = buildShortSummary(12, 5)
    expect(result.tengoLabel).toBe('Tengo 12')
    expect(result.buscoLabel).toBe('Busco 5')
  })

  it('returns "Sin repetidas" when no duplicates', () => {
    const result = buildShortSummary(0, 5)
    expect(result.tengoLabel).toBe('Sin repetidas')
    expect(result.buscoLabel).toBe('Busco 5')
  })

  it('returns "Album completo" when nothing missing', () => {
    const result = buildShortSummary(3, 0)
    expect(result.tengoLabel).toBe('Tengo 3')
    expect(result.buscoLabel).toBe('Album completo')
  })

  it('both zero states', () => {
    const result = buildShortSummary(0, 0)
    expect(result.tengoLabel).toBe('Sin repetidas')
    expect(result.buscoLabel).toBe('Album completo')
  })
})

describe('findNearlyCompleteTeams', () => {
  it('returns teams with 1 missing sticker', () => {
    const teams = [
      { team: 'ARG', missing: 1 },
      { team: 'BRA', missing: 5 },
    ]
    const result = findNearlyCompleteTeams(teams)
    expect(result).toHaveLength(1)
    expect(result[0].team).toBe('ARG')
  })

  it('returns teams with 2 missing stickers', () => {
    const teams = [
      { team: 'ARG', missing: 2 },
      { team: 'BRA', missing: 3 },
    ]
    const result = findNearlyCompleteTeams(teams)
    expect(result).toHaveLength(1)
    expect(result[0].team).toBe('ARG')
  })

  it('returns multiple nearly-complete teams sorted by missing count', () => {
    const teams = [
      { team: 'BRA', missing: 2 },
      { team: 'ARG', missing: 1 },
      { team: 'USA', missing: 5 },
    ]
    const result = findNearlyCompleteTeams(teams)
    expect(result).toHaveLength(2)
    expect(result[0].team).toBe('ARG') // missing=1 first
    expect(result[1].team).toBe('BRA') // missing=2 second
  })

  it('excludes teams with 0 missing', () => {
    const teams = [
      { team: 'ARG', missing: 0 },
      { team: 'BRA', missing: 2 },
    ]
    const result = findNearlyCompleteTeams(teams)
    expect(result).toHaveLength(1)
    expect(result[0].team).toBe('BRA')
  })

  it('excludes teams with 3+ missing', () => {
    const teams = [
      { team: 'ARG', missing: 3 },
      { team: 'BRA', missing: 10 },
      { team: 'USA', missing: 2 },
    ]
    const result = findNearlyCompleteTeams(teams)
    expect(result).toHaveLength(1)
    expect(result[0].team).toBe('USA')
  })

  it('handles empty array', () => {
    const result = findNearlyCompleteTeams([])
    expect(result).toHaveLength(0)
  })
})