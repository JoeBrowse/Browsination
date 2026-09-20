import { describe, expect, it } from 'vitest'
import { routineStats } from './logic'

describe('routineStats', () => {
  it('reports best, recent average, trend and delta', () => {
    const values = [10, 12, 8, 15, 20, 18, 22, 25, 19, 30, 28, 33, 31, 35]
    const s = routineStats(values)
    expect(s.count).toBe(14)
    expect(s.best).toBe(35)
    expect(s.recentAvg).toBe(26.1)
    expect(s.trend).toEqual(values)
    expect(s.delta).toBe(14.9)
  })
  it('handles empty and short histories', () => {
    expect(routineStats([])).toMatchObject({ count: 0, best: null, recentAvg: null, delta: null })
    expect(routineStats([7])).toMatchObject({ count: 1, best: 7, recentAvg: 7, avg: 7, delta: null })
  })
})
