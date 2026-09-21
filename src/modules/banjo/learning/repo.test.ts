import { describe, expect, it } from 'vitest'
import { makeTestDb } from '@/test/db'
import { banjoRepo, LOG } from '../repo'

describe('banjo learning repo', () => {
  it('learns bars into chunks, reviews and reschedules them, and logs both', async () => {
    const db = await makeTestDb()
    const repo = banjoRepo(db)
    const piece = await repo.addPiece('Cripple Creek')
    await repo.updatePiece(piece.id, { bars: 10 })
    const c1 = await repo.learnBars(piece.id, 4, '2026-10-10')
    expect(c1).toMatchObject({ from_bar: 1, to_bar: 4, due: '2026-10-11', reps: 0 })
    const c2 = await repo.learnBars(piece.id, 8, '2026-10-10')
    // clamped to the piece's bar count
    expect(c2).toMatchObject({ from_bar: 5, to_bar: 10 })
    expect((await repo.piece(piece.id))!.learned_bars).toBe(10)
    expect(await repo.learnBars(piece.id, 2, '2026-10-10')).toBeNull()

    const reviewed = await repo.review(c1!.id, 3, '2026-10-11')
    expect(reviewed).toMatchObject({ interval_days: 3, due: '2026-10-14', reps: 1, last_quality: 3 })
    const shaky = await repo.review(c2!.id, 1, '2026-10-11')
    expect(shaky).toMatchObject({ interval_days: 1, due: '2026-10-12', lapses: 1 })
    expect(await repo.reviewsOn('2026-10-11')).toBe(0) // logged at the real clock, not the test day
    const learns = await repo.logs.listByType(LOG.learn, '2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z')
    const reviews = await repo.logs.listByType(LOG.review, '2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z')
    expect(learns.map((e) => e.value)).toEqual([4, 6])
    expect(reviews.map((e) => e.value)).toEqual([3, 1])
    expect(reviews[0]!.payload).toMatchObject({ piece_id: piece.id, from_bar: 1, to_bar: 4, interval_before: 1, interval_after: 3 })

    // removing the last chunk moves the frontier back; reset clears everything
    await repo.removeChunk(c2!.id)
    expect((await repo.piece(piece.id))!.learned_bars).toBe(4)
    await repo.resetLearning(piece.id)
    expect(await repo.chunks(piece.id)).toEqual([])
    expect((await repo.piece(piece.id))!.learned_bars).toBe(0)
  })
})
