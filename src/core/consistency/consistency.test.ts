import { describe, expect, it } from 'vitest'
import { consistency, consistencyLabel, daysWith, heatmap } from './consistency'

describe('consistency', () => {
  it('counts distinct days in the window and never resets', () => {
    const days = new Set(['2026-09-14', '2026-09-15', '2026-09-18', '2026-09-20'])
    const c = consistency(days, '2026-09-20', 7)
    expect(c.hit).toBe(4)
    expect(c.grid).toEqual([true, true, false, false, true, false, true])
    expect(consistencyLabel(c)).toBe('4 of 7')
  })
  it('applies a weekly target proportionally', () => {
    const days = new Set(['2026-09-19', '2026-09-20', '2026-09-18'])
    expect(consistency(days, '2026-09-20', 7, 3).targetMet).toBe(true)
    expect(consistency(days, '2026-09-20', 7, 5).targetMet).toBe(false)
    expect(consistency(days, '2026-09-20', 14, 3).targetMet).toBe(false)
  })
  it('buckets stamps with the day-start rule', () => {
    const days = daysWith([{ ts: '2026-09-21T00:30:00.000Z', tz_offset_min: 60 }], 4)
    expect([...days]).toEqual(['2026-09-20'])
  })
})

describe('heatmap', () => {
  it('builds 12 weeks ending in the current week, Monday first, flagging future days', () => {
    const h = heatmap(new Set(['2026-09-14', '2026-09-20']), '2026-09-16', 12)
    expect(h).toHaveLength(12)
    const last = h[11]!
    expect(last.monday).toBe('2026-09-14')
    expect(last.days[0]).toEqual({ day: '2026-09-14', hit: true, future: false })
    expect(last.days[6]).toEqual({ day: '2026-09-20', hit: true, future: true })
    expect(h[0]!.monday).toBe('2026-06-29')
  })
})
