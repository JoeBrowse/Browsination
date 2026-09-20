import { describe, expect, it } from 'vitest'
import { makeTestDb } from '@/test/db'
import { sleepHours } from './SleepSheet'
import { brainRepo, LOG } from './repo'

const DAY = 4

describe('brainRepo', () => {
  it('creates habits and toggles a tick for the logical day', async () => {
    const db = await makeTestDb()
    const repo = brainRepo(db)
    const h = await repo.createHabit(' Read ', 5)
    expect(h.name).toBe('Read')
    const today = '2026-09-20'
    // toggleHabit stamps "now"; entriesOn uses the given day, so use the real today for the round trip
    const now = new Date()
    const realToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const day = now.getHours() < DAY ? shift(realToday, -1) : realToday
    expect(await repo.toggleHabit(h.id, day, DAY)).toBe(true)
    expect((await repo.habitTicksOn(day, DAY)).has(h.id)).toBe(true)
    expect(await repo.toggleHabit(h.id, day, DAY)).toBe(false)
    expect((await repo.habitTicksOn(day, DAY)).has(h.id)).toBe(false)
    expect(today).toBeTruthy()
  })

  it('upserts one mood per day, keeping the note', async () => {
    const db = await makeTestDb()
    const repo = brainRepo(db)
    const now = new Date()
    const realToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const day = now.getHours() < DAY ? shift(realToday, -1) : realToday
    const a = await repo.upsertDaily(LOG.mood, day, DAY, { value: 3, unit: 'score' })
    const b = await repo.upsertDaily(LOG.mood, day, DAY, { payload: { note: 'tired' } })
    expect(b.id).toBe(a.id)
    expect(b.value).toBe(3)
    expect(b.payload).toEqual({ note: 'tired' })
    const c = await repo.upsertDaily(LOG.mood, day, DAY, { value: 4 })
    expect(c.id).toBe(a.id)
    expect(c.value).toBe(4)
    expect(c.payload).toEqual({ note: 'tired' })
    expect(await repo.entriesOn(LOG.mood, day, DAY)).toHaveLength(1)
  })
})

describe('sleepHours', () => {
  it('wraps past midnight', () => {
    expect(sleepHours('23:00', '07:00')).toBe(8)
    expect(sleepHours('00:30', '07:00')).toBe(6.5)
    expect(sleepHours('07:00', '07:00')).toBe(24)
  })
})

function shift(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}
