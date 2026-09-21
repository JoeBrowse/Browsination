import { describe, expect, it } from 'vitest'
import { chunkStage, interleave, newChunkState, pieceProgress, planSession, scheduleReview, suggestedBars, type ChunkLike, type PieceLike } from './logic'

const chunk = (over: Partial<ChunkLike>): ChunkLike => ({ id: 'c', piece_id: 'p', from_bar: 1, to_bar: 4, due: '2026-10-10', interval_days: 1, ease: 2.5, reps: 0, lapses: 0, last_reviewed: null, ...over })
const piece = (over: Partial<PieceLike>): PieceLike => ({ id: 'p', title: 'P', status: 'learning', bars: 32, learned_bars: 0, ...over })

describe('review scheduling', () => {
  it('a new chunk is due tomorrow', () => {
    expect(newChunkState('2026-10-10').due).toBe('2026-10-11')
  })
  it('solid grows the interval 1 → 3 → 7 → ×ease, capped', () => {
    let c = chunk({})
    c = { ...c, ...scheduleReview(c, 3, '2026-10-11') }
    expect(c.interval_days).toBe(3)
    expect(c.due).toBe('2026-10-14')
    c = { ...c, ...scheduleReview(c, 3, '2026-10-14') }
    expect(c.interval_days).toBe(7)
    c = { ...c, ...scheduleReview(c, 3, '2026-10-21') }
    expect(c.interval_days).toBe(Math.round(7 * 2.6))
    expect(chunkStage(c)).toBe('review')
    for (let i = 0; i < 6; i++) c = { ...c, ...scheduleReview(c, 3, c.due) }
    expect(c.interval_days).toBe(60)
    expect(chunkStage(c)).toBe('solid')
  })
  it('OK grows gently, shaky resets to tomorrow and lowers ease', () => {
    const ok = scheduleReview(chunk({ interval_days: 7, reps: 2 }), 2, '2026-10-10')
    expect(ok.interval_days).toBe(10)
    expect(ok.ease).toBe(2.5)
    const shaky = scheduleReview(chunk({ interval_days: 14, reps: 3, ease: 2.6 }), 1, '2026-10-10')
    expect(shaky).toMatchObject({ interval_days: 1, due: '2026-10-11', reps: 0, lapses: 1, ease: 2.4 })
    expect(scheduleReview(chunk({ ease: 1.3 }), 1, '2026-10-10').ease).toBe(1.3)
  })
})

describe('progress', () => {
  it('learned and solid bars as fractions', () => {
    const p = piece({ learned_bars: 12 })
    const chunks = [chunk({ id: 'a', from_bar: 1, to_bar: 8, reps: 4, interval_days: 30 }), chunk({ id: 'b', from_bar: 9, to_bar: 12, reps: 1, interval_days: 3 })]
    const pr = pieceProgress(p, chunks)
    expect(pr).toMatchObject({ bars: 32, learned: 12, solid: 8 })
    expect(pr.learnedFraction).toBeCloseTo(0.375)
    expect(pr.solidFraction).toBeCloseTo(0.25)
    expect(pieceProgress(piece({ bars: null, learned_bars: 5 }), []).learnedFraction).toBeNull()
  })
  it('suggests the piece’s usual chunk size', () => {
    expect(suggestedBars([], 'p')).toBe(4)
    expect(suggestedBars([chunk({ from_bar: 1, to_bar: 2 }), chunk({ from_bar: 3, to_bar: 10 }), chunk({ from_bar: 11, to_bar: 16 })], 'p')).toBe(6)
  })
})

describe('session plan', () => {
  it('interleaves pieces and puts the oldest debt first', () => {
    const chunks = [
      chunk({ id: 'a1', piece_id: 'a', due: '2026-10-08' }),
      chunk({ id: 'a2', piece_id: 'a', due: '2026-10-09', from_bar: 5, to_bar: 8 }),
      chunk({ id: 'b1', piece_id: 'b', due: '2026-10-10' }),
      chunk({ id: 'c1', piece_id: 'c', due: '2026-10-12' }),
    ]
    const plan = planSession([piece({ id: 'a', title: 'A' }), piece({ id: 'b', title: 'B' }), piece({ id: 'c', title: 'C' })], chunks, '2026-10-10')
    expect(plan.reviews.map((c) => c.id)).toEqual(['a1', 'b1', 'a2'])
    expect(plan.moreDue).toBe(0)
    expect(interleave([{ piece_id: 'a' }, { piece_id: 'a' }, { piece_id: 'b' }]).map((x) => x.piece_id)).toEqual(['a', 'b', 'a'])
  })
  it('caps reviews and reports the rest', () => {
    const chunks = Array.from({ length: 8 }, (_, i) => chunk({ id: `c${i}`, piece_id: `p${i % 2}`, due: '2026-10-01' }))
    const plan = planSession([piece({ id: 'p0' }), piece({ id: 'p1' })], chunks, '2026-10-10', 5)
    expect(plan.reviews).toHaveLength(5)
    expect(plan.moreDue).toBe(3)
  })
  it('learns on the piece that has waited longest, never on one that is finished or performance-ready', () => {
    const pieces = [piece({ id: 'a', title: 'A' }), piece({ id: 'b', title: 'B' }), piece({ id: 'r', title: 'Ready', status: 'performance-ready' }), piece({ id: 'f', title: 'Full', learned_bars: 32 })]
    const chunks = [chunk({ id: 'a1', piece_id: 'a', last_reviewed: '2026-10-09', due: '2026-10-12', interval_days: 3, reps: 1 }), chunk({ id: 'b1', piece_id: 'b', last_reviewed: '2026-10-05', due: '2026-10-12', interval_days: 7, reps: 2 })]
    const plan = planSession(pieces, chunks, '2026-10-10')
    expect(plan.learn?.piece.id).toBe('b')
    expect(plan.learn?.reason).toBe('least recent')
    // a piece never touched goes first
    expect(planSession([...pieces, piece({ id: 'n', title: 'New' })], chunks, '2026-10-10').learn?.piece.id).toBe('n')
    expect(planSession([piece({ id: 'f', learned_bars: 32 })], [], '2026-10-10').learn).toBeNull()
  })
  it('holds off adding to a piece with three fresh chunks while another piece is available', () => {
    const fresh = ['1', '2', '3'].map((i) => chunk({ id: `a${i}`, piece_id: 'a', interval_days: 1, due: '2026-10-11', last_reviewed: '2026-10-01' }))
    const plan = planSession([piece({ id: 'a', title: 'A' }), piece({ id: 'b', title: 'B' })], [...fresh, chunk({ id: 'b1', piece_id: 'b', last_reviewed: '2026-10-09', interval_days: 7, reps: 2, due: '2026-10-16' })], '2026-10-10')
    expect(plan.learn?.piece.id).toBe('b')
    // alone, it still gets suggested
    expect(planSession([piece({ id: 'a', title: 'A' })], fresh, '2026-10-10').learn?.piece.id).toBe('a')
    expect(planSession([piece({ id: 'a', title: 'A' })], fresh, '2026-10-10').learn?.fromBar).toBe(1)
  })
})
