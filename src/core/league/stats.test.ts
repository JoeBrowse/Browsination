import { describe, expect, it } from 'vitest'
import { resultLabel, seasonStats, splitFixtures } from './stats'

describe('seasonStats', () => {
  it('summarises a season', () => {
    const s = seasonStats([
      { result: 1, colour: 'white', opponent_rating: 1600 },
      { result: 0.5, colour: 'black', opponent_rating: 1700 },
      { result: 0, colour: 'black', opponent_rating: 1800 },
      { result: null, colour: 'white' },
    ])
    expect(s).toMatchObject({ played: 3, won: 1, drawn: 1, lost: 1, points: 1.5, scorePct: 50, avgOpponentRating: 1700, performance: 1700 })
    expect(s.byColour).toEqual({ white: { played: 1, points: 1 }, black: { played: 2, points: 0.5 } })
  })
  it('handles an empty season', () => {
    expect(seasonStats([])).toMatchObject({ played: 0, scorePct: 0, avgOpponentRating: null, performance: null })
    expect(resultLabel(null)).toBe('–')
    expect(resultLabel(0.5)).toBe('D')
  })
})

describe('splitFixtures', () => {
  it('puts what is coming next first and the rest newest-first', () => {
    const list = [{ date: '2026-09-02' }, { date: '2027-05-19' }, { date: '2026-12-09' }, { date: '2026-09-16' }]
    const { next, past } = splitFixtures(list, '2026-09-16')
    expect(next.map((f) => f.date)).toEqual(['2026-09-16', '2026-12-09', '2027-05-19'])
    expect(past.map((f) => f.date)).toEqual(['2026-09-02'])
  })
})
