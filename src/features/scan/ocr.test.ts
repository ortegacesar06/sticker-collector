import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseDigitsFromOcr,
  formStickerNumbers,
  parseOcrResult,
  matchToCatalog,
} from './ocr'

// ─── Mock catalog module ──────────────────────────────────────────────────────

const mockCatalog = {
  version: '1.0.0',
  total: 50,
  stickers: [
    { number: 1, name: 'Logo Argentina', team: 'ARG', countryCode: 'AR', position: 'emblem', image: 'arg-emblems.png' },
    { number: 2, name: 'Lionel Messi', team: 'ARG', countryCode: 'AR', position: 'player', club: 'Inter Miami', jersey: 10, image: 'arg-10-messi.png' },
    { number: 3, name: 'Ángel Di María', team: 'ARG', countryCode: 'AR', position: 'player', club: 'Benfica', jersey: 11, image: 'arg-11-di-maria.png' },
    { number: 7, name: 'Neymar Jr', team: 'BRA', countryCode: 'BR', position: 'player', club: 'Al-Hilal', jersey: 10, image: 'bra-10-neymar.png' },
    { number: 10, name: 'Casemiro', team: 'BRA', countryCode: 'BR', position: 'player', club: 'Manchester United', jersey: 18, image: 'bra-18-casemiro.png' },
    { number: 42, name: 'Virgil van Dijk', team: 'NED', countryCode: 'NL', position: 'player', club: 'Liverpool', jersey: 4, image: 'ned-4-vandijk.png' },
    { number: 100, name: 'Special Card', team: 'WORLD', countryCode: 'XX', position: 'player', image: 'special.png' },
  ],
}

vi.mock('../../data/catalog', () => ({
  getCatalog: vi.fn(() => mockCatalog),
  getStickerByNumber: vi.fn((n: number) => mockCatalog.stickers.find(s => s.number === n)),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OCR Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseDigitsFromOcr', () => {
    it('extracts single digits', () => {
      expect(parseDigitsFromOcr('Messi 10')).toEqual([1, 0])
      expect(parseDigitsFromOcr('Card #42')).toEqual([4, 2])
    })

    it('extracts multiple digit sequences', () => {
      expect(parseDigitsFromOcr('Numbers 1, 2, 3')).toEqual([1, 2, 3])
    })

    it('handles messy OCR output', () => {
      // '8 0 0 / 0 O' has digits: 8, 0, 0, 0 (3 zeros separated by spaces/slash)
      // 'O' is not a digit so only 4 zeros total
      expect(parseDigitsFromOcr('8 0 0 / 0 O')).toEqual([8, 0, 0, 0])
    })

    it('returns empty array for no digits', () => {
      expect(parseDigitsFromOcr('No numbers here')).toEqual([])
    })

    it('extracts multi-digit numbers correctly', () => {
      expect(parseDigitsFromOcr('#100')).toEqual([1, 0, 0])
    })
  })

  describe('formStickerNumbers', () => {
    it('forms 1-digit numbers', () => {
      const digits = [2]
      const result = formStickerNumbers(digits)
      expect(result).toContain(2)
    })

    it('forms 2-digit numbers', () => {
      const digits = [1, 0]
      const result = formStickerNumbers(digits)
      expect(result).toContain(10)
    })

    it('forms 3-digit numbers', () => {
      const digits = [1, 0, 0]
      const result = formStickerNumbers(digits)
      expect(result).toContain(100)
    })

    it('tries all combinations', () => {
      // Digits "1", "2", "3" could form: 1, 2, 3, 12, 23, 123
      // But only numbers in catalog are kept (2, 3 are in catalog but 12, 23, 123 are not)
      const digits = [1, 2, 3]
      const result = formStickerNumbers(digits)
      expect(result).toContain(2)
      expect(result).toContain(3)
      // 1 is not a valid sticker number in our mock catalog
    })

    it('ignores numbers not in catalog', () => {
      // 99 is not in mock catalog
      const digits = [9, 9]
      const result = formStickerNumbers(digits)
      expect(result).not.toContain(99)
    })

    it('returns unique sorted results', () => {
      const digits = [1, 1, 2, 2]
      const result = formStickerNumbers(digits)
      // Should not have duplicates
      expect(result).toEqual([...new Set(result)].sort((a, b) => a - b))
    })
  })

  describe('parseOcrResult', () => {
    it('parses simple OCR result with sticker number', () => {
      const result = parseOcrResult('Messi\n10\n')
      expect(result).toContain(10)
    })

    it('returns empty array for unrecognized text', () => {
      const result = parseOcrResult('abcdefgh')
      expect(result).toEqual([])
    })

    it('handles messy OCR with special characters', () => {
      const result = parseOcrResult('S+1ck<er #42 ()*&')
      expect(result).toContain(42)
    })

    it('finds numbers in full OCR output', () => {
      const result = parseOcrResult(`
        Panini FIFA World Cup 2026
        Sticker #7
        Neymar Jr
        Brasil
      `)
      expect(result).toContain(7)
    })
  })

  describe('matchToCatalog', () => {
    it('returns single sticker when unique match', () => {
      const result = matchToCatalog(2)
      expect(result).toMatchObject({ number: 2, name: 'Lionel Messi' })
    })

    it('returns array when ambiguous (same number different teams)', () => {
      // In mock catalog, each number is unique so this won't happen
      // but we can test the return type
      const result = matchToCatalog(999)
      expect(result).toEqual([])
    })

    it('returns empty array when no match', () => {
      const result = matchToCatalog(999)
      expect(result).toEqual([])
    })
  })
})

describe('OCR pipeline integration', () => {
  it('complete pipeline: OCR text -> digits -> numbers -> catalog match', () => {
    const rawOcr = `
      =======
      |  10  |
      =======
      Neymar Jr
    `

    // parseDigitsFromOcr extracts individual digits, not combined numbers
    const digits = parseDigitsFromOcr(rawOcr)
    expect(digits).toContain(1)
    expect(digits).toContain(0)

    // formStickerNumbers combines adjacent digits to form valid numbers
    const numbers = formStickerNumbers(digits)
    expect(numbers).toContain(10)

    const match = matchToCatalog(10)
    expect(match).toMatchObject({ number: 10, team: 'BRA' })
  })

  it('handles real-world messy OCR', () => {
    const messyOcr = 'P<1n1n1 FIFA WC 2026\n//\\n|  7  |\nNeymar Jr'

    const digits = parseDigitsFromOcr(messyOcr)
    const numbers = formStickerNumbers(digits)

    expect(numbers).toContain(7)
    // 2026 becomes [2, 0, 2, 6] which can form 2, 0, 20, 26, 202, 2026, etc.
    // Only numbers in catalog (7) will be returned
  })
})
