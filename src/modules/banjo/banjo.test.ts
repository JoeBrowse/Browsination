import { describe, expect, it } from 'vitest'
import { makeTestDb } from '@/test/db'
import { banjoRepo } from './repo'
import { elapsedLabel } from './timerStore'

describe('banjoRepo', () => {
  it('logs practice with start and end instants and sums minutes', async () => {
    const db = await makeTestDb()
    const repo = banjoRepo(db)
    const piece = await repo.addPiece('Cripple Creek', 'gDGBD')
    const e = await repo.logPractice({ minutes: 25, worked_on: 'rolls', piece_id: piece.id })
    expect(e.value).toBe(25)
    expect(Date.parse(e.ts_end!) - Date.parse(e.ts)).toBe(25 * 60_000)
    expect(e.entity_id).toBe(piece.id)
    expect(e.payload).toMatchObject({ worked_on: 'rolls', piece_id: piece.id })
    await repo.logPractice({ minutes: 10, ts: '2026-09-01T10:00:00.000Z' })
    expect(await repo.minutesSince('2000-01-01T00:00:00.000Z')).toBe(35)
    expect((await repo.sessions()).map((s) => s.value)).toEqual([25, 10])
    const goal = await repo.addGoal({ title: 'FMB', piece_id: piece.id, target_date: '2026-12-31' })
    expect((await repo.goals('active'))[0]?.id).toBe(goal.id)
    await repo.removePiece(piece.id)
    expect((await repo.goals('active'))[0]?.piece_id).toBeNull()
  })
})

describe('elapsedLabel', () => {
  it('formats minutes and hours', () => {
    expect(elapsedLabel(0, 65_000)).toBe('1:05')
    expect(elapsedLabel(0, 3_725_000)).toBe('1:02:05')
  })
})
