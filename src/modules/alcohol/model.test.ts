import { describe, expect, it } from 'vitest'
import { bedtimeNote, caffeineCurve, remainingAt } from './caffeine'
import { forecast, nextWallClock } from './forecast'
import { bacAt, band, curve, DEFAULT_PARAMS, gramsOf, peakOf, summarise, ukUnitsOf, unitsFromGrams } from './model'

const joe = { weightKg: 80, sex: 'male' as const }
const H = 3_600_000

describe('units and grams', () => {
  it('converts a pint of 4.5% lager', () => {
    expect(ukUnitsOf(568, 4.5)).toBeCloseTo(2.56, 2)
    expect(gramsOf(568, 4.5)).toBeCloseTo(20.2, 1)
    expect(unitsFromGrams(gramsOf(568, 4.5))).toBeCloseTo(2.56, 2)
  })
})

describe('curve', () => {
  it('rises during absorption, peaks, then falls at the elimination rate to zero', () => {
    const t0 = Date.UTC(2026, 8, 25, 20, 0)
    const pts = curve([{ atMs: t0, grams: 20 }], joe, DEFAULT_PARAMS, t0, t0 + 6 * H, 1)
    const peak = summarise(pts, t0).peak!
    // fully absorbed peak would be 20 / (0.68 × 80) = 0.368; elimination during absorption trims it
    expect(peak.bac).toBeGreaterThan(0.2)
    expect(peak.bac).toBeLessThan(peakOf(20, joe, DEFAULT_PARAMS))
    expect(peak.tMs - t0).toBeGreaterThan(20 * 60_000)
    expect(peak.tMs - t0).toBeLessThan(90 * 60_000)
    // roughly β = 0.15 g/L per hour after the peak
    const a = bacAt(pts, peak.tMs + H)
    const b = bacAt(pts, peak.tMs + 2 * H)
    expect(a - b).toBeCloseTo(0.15, 1)
    expect(bacAt(pts, t0 + 5 * H)).toBe(0)
  })

  it('is cumulative: a second drink adds to what is still there', () => {
    const t0 = Date.UTC(2026, 8, 25, 20, 0)
    const one = curve([{ atMs: t0, grams: 20 }], joe, DEFAULT_PARAMS, t0, t0 + 8 * H, 2)
    const two = curve(
      [
        { atMs: t0, grams: 20 },
        { atMs: t0 + H, grams: 20 },
      ],
      joe,
      DEFAULT_PARAMS,
      t0,
      t0 + 8 * H,
      2,
    )
    expect(summarise(two, t0).peak!.bac).toBeGreaterThan(summarise(one, t0).peak!.bac * 1.5)
    expect(summarise(two, t0).zeroAtMs!).toBeGreaterThan(summarise(one, t0).zeroAtMs!)
  })

  it('never goes negative and elimination pauses at zero', () => {
    const t0 = Date.UTC(2026, 8, 25, 12, 0)
    const pts = curve(
      [
        { atMs: t0, grams: 8 },
        { atMs: t0 + 8 * H, grams: 8 },
      ],
      joe,
      DEFAULT_PARAMS,
      t0,
      t0 + 12 * H,
      5,
    )
    expect(pts.every((p) => p.bac >= 0)).toBe(true)
    const p1 = summarise(pts.filter((p) => p.tMs < t0 + 8 * H), t0).peak!.bac
    const p2 = summarise(pts.filter((p) => p.tMs >= t0 + 8 * H), t0).peak!.bac
    expect(Math.abs(p1 - p2)).toBeLessThan(0.02)
  })

  it('uses a lower distribution factor for women', () => {
    expect(peakOf(20, { weightKg: 80, sex: 'female' }, DEFAULT_PARAMS)).toBeGreaterThan(peakOf(20, joe, DEFAULT_PARAMS))
  })

  it('bands never mention driving', () => {
    for (const bac of [0, 0.2, 0.5, 0.8, 1.2, 2]) {
      const b = band(bac)
      expect(`${b.label} ${b.note}`.toLowerCase()).not.toContain('driv')
    }
  })
})

describe('forecast', () => {
  it('produces with/without curves, a timeline, sleep and week totals', () => {
    const now = new Date(2026, 8, 25, 20, 0).getTime()
    const f = forecast({
      existing: [{ atMs: now - H, grams: 20 }],
      candidate: { atMs: now, grams: 20 },
      person: joe,
      params: DEFAULT_PARAMS,
      nowMs: now,
      usualBedtime: '23:00',
      usualSleepHours: 8,
      weekGramsSoFar: 40,
    })
    expect(f.with.length).toBe(f.without.length)
    expect(f.peak!.bac).toBeGreaterThan(0.3)
    expect(f.zeroAtMs).not.toBeNull()
    expect(f.timeline.some((l) => l.text.startsWith('Peak'))).toBe(true)
    expect(f.timeline.some((l) => l.text.startsWith('Back to zero'))).toBe(true)
    expect(f.sleep.bacAtBed).toBeGreaterThan(0)
    expect(f.sleep.text).toContain('bedtime')
    expect(f.session.units).toBeCloseTo(5.07, 1)
    expect(f.week.units).toBeCloseTo(unitsFromGrams(60), 2)
    expect(f.week.guideline).toBe(14)
    expect(nextWallClock('23:00', now) - now).toBe(3 * H)
  })
})

describe('caffeine', () => {
  it('halves every half-life and adds doses', () => {
    const t0 = 0
    expect(remainingAt([{ atMs: t0, mg: 100 }], t0 + 5 * H)).toBeCloseTo(50, 5)
    expect(remainingAt([{ atMs: t0, mg: 100 }, { atMs: t0 + 5 * H, mg: 100 }], t0 + 5 * H)).toBeCloseTo(150, 5)
    expect(caffeineCurve([{ atMs: t0, mg: 100 }], t0, t0 + H, 5, 30)).toHaveLength(3)
    expect(bedtimeNote(20)).toContain('unlikely')
    expect(bedtimeNote(150)).toContain('shorten')
  })
})
