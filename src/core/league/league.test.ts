import { describe, expect, it } from 'vitest'
import { makeTestDb } from '@/test/db'
import { logEntriesRepo } from '../repos/logEntries'
import { leagueRepo } from './repo'

describe('leagueRepo', () => {
  it('keeps modules apart and logs one match_result per fixture', async () => {
    const db = await makeTestDb()
    const chess = leagueRepo(db, 'chess')
    const snooker = leagueRepo(db, 'snooker')
    const season = await chess.addSeason({ name: '2026/27', team: 'Cardiff Crows' })
    await snooker.addSeason({ name: 'Winter' })
    expect(await chess.seasons()).toHaveLength(1)
    expect(await snooker.seasons()).toHaveLength(1)

    const fx = await chess.addFixture({ season_id: season.id, date: '2026-09-22', opponent: 'A. Jones', colour: 'white', result: 1, opponent_rating: 1600 })
    const logs = logEntriesRepo(db)
    expect(await logs.listByType('match_result', '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z')).toHaveLength(1)
    await chess.updateFixture(fx.id, { result: 0.5 })
    const entries = await logs.listByType('match_result', '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.value).toBe(0.5)
    await chess.updateFixture(fx.id, { result: null })
    expect(await logs.listByType('match_result', '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z')).toHaveLength(0)
    expect((await chess.nextFixture('2026-09-01'))?.id).toBe(fx.id)
  })
})
