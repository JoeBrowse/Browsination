import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, lastNDays, localDayOf } from './localDay'

describe('localDayOf', () => {
  it('assigns a 01:30 log to the previous day when the day starts at 04:00', () => {
    // 01:30 BST on 21 Sep = 00:30Z
    expect(localDayOf('2026-09-21T00:30:00.000Z', 60, 4)).toBe('2026-09-20')
    expect(localDayOf('2026-09-21T00:30:00.000Z', 60, 0)).toBe('2026-09-21')
  })
  it('uses the offset captured at write time, not the current zone', () => {
    // 23:30 in Lisbon (UTC+1 in summer) is 22:30Z
    expect(localDayOf('2026-07-10T22:30:00.000Z', 60, 4)).toBe('2026-07-10')
    // same instant logged in Tokyo (+9) is already 07:30 the next day
    expect(localDayOf('2026-07-10T22:30:00.000Z', 540, 4)).toBe('2026-07-11')
  })
  it('handles the boundary exactly', () => {
    expect(localDayOf('2026-01-10T03:59:59.000Z', 0, 4)).toBe('2026-01-09')
    expect(localDayOf('2026-01-10T04:00:00.000Z', 0, 4)).toBe('2026-01-10')
  })
  it('is stable across the UK clock changes', () => {
    // 29 Mar 2026: BST starts at 01:00Z. 02:30 BST = 01:30Z, offset 60.
    expect(localDayOf('2026-03-29T01:30:00.000Z', 60, 4)).toBe('2026-03-28')
    // 25 Oct 2026: BST ends at 01:00Z. 01:30 GMT = 01:30Z, offset 0.
    expect(localDayOf('2026-10-25T01:30:00.000Z', 0, 4)).toBe('2026-10-24')
  })
})

describe('civil day arithmetic', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('lists the last N days ending today', () => {
    expect(lastNDays('2026-09-20', 3)).toEqual(['2026-09-18', '2026-09-19', '2026-09-20'])
  })
  it('counts whole days between two days', () => {
    expect(daysBetween('2026-09-20', '2026-10-01')).toBe(11)
    expect(daysBetween('2026-10-01', '2026-09-20')).toBe(-11)
  })
})
