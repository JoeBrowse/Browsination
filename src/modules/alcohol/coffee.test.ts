import { describe, expect, it } from 'vitest'
import { clearAt, cupsLabel, dayStatus, nthLabel, weekSummary, type CupLike } from './coffee'

const cup = (iso: string, mg = 95): CupLike => ({ ts: iso, tz_offset_min: 0, value: mg, payload: {} })

describe('one-a-day coffee', () => {
  it('reads today against the target', () => {
    const none = dayStatus([], 1, '12:00')
    expect(none).toMatchObject({ cups: 0, mg: 0, firstMs: null, left: 1, late: false })
    expect(cupsLabel(none)).toBe('0 of 1')
    const one = dayStatus([cup('2026-09-22T08:10:00Z')], 1, '12:00')
    expect(one).toMatchObject({ cups: 1, mg: 95, left: 0, late: false })
    expect(cupsLabel(one)).toBe('1 of 1')
    const two = dayStatus([cup('2026-09-22T08:10:00Z'), cup('2026-09-22T15:40:00Z', 63)], 1, '12:00')
    expect(two).toMatchObject({ cups: 2, mg: 158, left: 0, late: true })
    expect(two.firstMs).toBe(Date.parse('2026-09-22T08:10:00Z'))
    expect(two.lastMs).toBe(Date.parse('2026-09-22T15:40:00Z'))
  })
  it('names the cup about to be logged', () => {
    expect(nthLabel(1)).toBe('1st today')
    expect(nthLabel(2)).toBe('2nd today')
    expect(nthLabel(3)).toBe('3rd today')
    expect(nthLabel(4)).toBe('4th today')
    expect(nthLabel(11)).toBe('11th today')
  })
  it('says when caffeine drops below the level that matters for sleep', () => {
    const at = Date.parse('2026-09-22T08:00:00Z')
    // 95 mg at 08:00, half-life 5h: below 50 mg a little after 12:38
    const clear = clearAt([{ atMs: at, mg: 95 }], at, 5)!
    expect(new Date(clear).toISOString()).toMatch(/T1[23]:/)
    expect(clearAt([], at, 5)).toBeNull()
    // already below the threshold
    expect(clearAt([{ atMs: at, mg: 40 }], at, 5)).toBeNull()
    // a big late dose still clears within the day
    expect(clearAt([{ atMs: at, mg: 300 }], at, 5)).toBeGreaterThan(at)
  })
  it('summarises the week forgivingly', () => {
    const days = ['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22']
    const cups = [
      cup('2026-09-16T08:00:00Z'),
      cup('2026-09-17T08:00:00Z'),
      cup('2026-09-17T14:00:00Z'), // two that day
      cup('2026-09-19T08:00:00Z'),
      cup('2026-09-22T08:00:00Z'),
      cup('2026-09-15T08:00:00Z'), // outside the window
    ]
    const w = weekSummary(cups, days, 1, 0)
    expect(w).toMatchObject({ within: 6, window: 7, none: 3 })
    expect(w.average).toBeCloseTo(0.7)
    expect(w.perDay.map((d) => d.cups)).toEqual([1, 2, 0, 1, 0, 0, 1])
  })
  it('applies the day-start-hour rule (a 01:00 cup belongs to the day before)', () => {
    const days = ['2026-09-21', '2026-09-22']
    const w = weekSummary([{ ts: '2026-09-22T01:00:00Z', tz_offset_min: 0, value: 95, payload: {} }], days, 1, 4)
    expect(w.perDay).toEqual([{ day: '2026-09-21', cups: 1 }, { day: '2026-09-22', cups: 0 }])
  })
})
