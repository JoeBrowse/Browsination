import { describe, expect, it } from 'vitest'
import { leagueRepo } from '@/core/league/repo'
import { makeTestDb } from '@/test/db'
import { EGCA_FIXTURES, EGCA_SEASON, EGCA_TEAMS } from './egca'
import { loadEgca } from './loadEgca'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dayOf = (date: string) => DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]!

describe('EGCA 2026/27 fixture list', () => {
  it('is a full 18-round season, nine home and nine away', () => {
    expect(EGCA_FIXTURES).toHaveLength(18)
    expect([...new Set(EGCA_FIXTURES.map((f) => f.round))]).toHaveLength(18)
    expect(EGCA_FIXTURES.filter((f) => f.home)).toHaveLength(9)
    // every opponent is played twice, once at home and once away
    const byTeam = new Map<string, boolean[]>()
    for (const f of EGCA_FIXTURES) byTeam.set(f.opponentTeam, [...(byTeam.get(f.opponentTeam) ?? []), f.home])
    expect(byTeam.size).toBe(9)
    for (const [, homes] of byTeam) expect([...homes].sort()).toEqual([false, true])
  })
  it('puts home matches on the Cardiff club night and away matches on the opponent’s', () => {
    for (const f of EGCA_FIXTURES) {
      const team = EGCA_TEAMS.find((t) => t.name === f.opponentTeam)!
      const night = f.home ? 'Tue/Wed' : team.night
      if (!night) continue // Centurians: club unknown
      expect(night.split('/'), `${f.opponentTeam} on ${f.date} (${dayOf(f.date)})`).toContain(dayOf(f.date))
    }
  })
  it('every opponent is in the directory', () => {
    for (const f of EGCA_FIXTURES) expect(EGCA_TEAMS.map((t) => t.name)).toContain(f.opponentTeam)
  })
})

describe('loading the season', () => {
  it('creates the season, the directory and every fixture with its venue', async () => {
    const db = await makeTestDb()
    const repo = leagueRepo(db, 'chess')
    const r = await loadEgca(repo)
    expect(r).toMatchObject({ added: 18, alreadyThere: 0, teams: EGCA_TEAMS.length })
    const fixtures = await repo.fixtures(r.seasonId)
    expect(fixtures).toHaveLength(18)
    const first = fixtures.find((f) => f.round === 1)!
    expect(first).toMatchObject({ date: '2026-09-02', opponent_team: 'Castles', home: 1, start_time: '19:30' })
    expect(first.venue).toContain('YMCA Community Centre')
    const away = fixtures.find((f) => f.round === 3)!
    expect(away).toMatchObject({ opponent_team: 'Phoenix', home: 0 })
    expect(away.venue).toContain('Hopkinstown')
    // an opponent with no club listed loads with an empty venue rather than being skipped
    expect(fixtures.find((f) => f.opponent_team === 'Centurians')!.venue).toBe('')
    const castles = await repo.team('Castles')
    expect(castles).toMatchObject({ captain: 'Guy Wagner', night: 'Tue/Wed', club: 'Cardiff Chess Club' })
    expect((await repo.seasons())[0]!.name).toBe(EGCA_SEASON)
  })
  it('a second run adds nothing and keeps results already entered', async () => {
    const db = await makeTestDb()
    const repo = leagueRepo(db, 'chess')
    const first = await loadEgca(repo)
    const fixture = (await repo.fixtures(first.seasonId)).find((f) => f.round === 1)!
    await repo.updateFixture(fixture.id, { result: 1, opponent: 'A N Other', board: 3 })
    const again = await loadEgca(repo)
    expect(again).toMatchObject({ seasonId: first.seasonId, added: 0, alreadyThere: 18 })
    const after = (await repo.fixtures(first.seasonId)).find((f) => f.id === fixture.id)!
    expect(after).toMatchObject({ result: 1, opponent: 'A N Other', board: 3 })
    expect(await repo.fixtures(first.seasonId)).toHaveLength(18)
  })
  it('does not overwrite team details filled in by hand', async () => {
    const db = await makeTestDb()
    const repo = leagueRepo(db, 'chess')
    await loadEgca(repo)
    const c = (await repo.team('Centurians'))!
    await repo.updateTeam(c.id, { venue: 'Somewhere', captain: 'Someone' })
    await loadEgca(repo)
    expect(await repo.team('Centurians')).toMatchObject({ venue: 'Somewhere', captain: 'Someone' })
  })
})
