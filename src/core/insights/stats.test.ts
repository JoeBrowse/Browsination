import { describe, expect, it } from 'vitest'
import { describeCorrelation, groupMean, groupSum, pairMaps, pctChange, pearson } from './stats'

describe('insights stats', () => {
  it('pearson on a straight line is 1, on noise is null-safe', () => {
    expect(pearson([{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }]).r).toBeCloseTo(1)
    expect(pearson([{ x: 1, y: 6 }, { x: 2, y: 4 }, { x: 3, y: 2 }]).r).toBeCloseTo(-1)
    expect(pearson([{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }]).r).toBeNull()
    expect(pearson([{ x: 1, y: 1 }, { x: 2, y: 2 }]).r).toBeNull()
    expect(pearson([]).n).toBe(0)
  })
  it('describes strength honestly, calling out small samples', () => {
    expect(describeCorrelation({ n: 0, r: null, xMean: null, yMean: null })).toBe('no data yet')
    expect(describeCorrelation({ n: 2, r: null, xMean: 1, yMean: 1 })).toBe('2 pairs, too few to say')
    expect(describeCorrelation({ n: 5, r: 0.7, xMean: 1, yMean: 1 })).toBe('strong positive, only 5 pairs')
    expect(describeCorrelation({ n: 20, r: -0.45, xMean: 1, yMean: 1 })).toBe('moderate negative')
    expect(describeCorrelation({ n: 20, r: 0.1, xMean: 1, yMean: 1 })).toBe('no clear link')
  })
  it('groups, pairs with a key shift and computes changes', () => {
    const units = groupSum([{ key: '2026-09-01', value: 2 }, { key: '2026-09-01', value: 3 }, { key: '2026-09-02', value: 1 }])
    const quality = groupMean([{ key: '2026-09-02', value: 2 }, { key: '2026-09-03', value: 4 }])
    // drinks on day D against sleep quality logged on D+1
    const pairs = pairMaps(units, quality, (k) => `2026-09-0${Number(k.slice(-1)) + 1}`)
    expect(pairs).toEqual([{ x: 5, y: 2 }, { x: 1, y: 4 }])
    expect(pctChange(12, 10)).toBeCloseTo(20)
    expect(pctChange(5, 0)).toBeNull()
  })
})
