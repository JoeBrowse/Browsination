import type { LeagueRepo } from '@/core/league/repo'
import { CROWS, EGCA_FIXTURES, EGCA_SEASON, EGCA_START_TIME, EGCA_TEAM, EGCA_TEAMS, type EgcaTeam } from './egca'

export interface LoadResult {
  seasonId: string
  added: number
  alreadyThere: number
  teams: number
}

const venueOf = (team: EgcaTeam | undefined, home: boolean): string => {
  const t = home ? CROWS : team
  if (!t || !t.venue) return ''
  return [t.venue, t.address].filter(Boolean).join(', ')
}

/**
 * Loads the EGCA 2026/27 Crows fixtures and the opposition directory. Idempotent: the season is
 * reused when it exists and a fixture already on that date against that team is left alone, so
 * results and notes already entered survive a second run.
 */
export async function loadEgca(repo: LeagueRepo): Promise<LoadResult> {
  const seasons = await repo.seasons()
  const season = seasons.find((s) => s.name === EGCA_SEASON) ?? (await repo.addSeason({ name: EGCA_SEASON, team: EGCA_TEAM, start_date: EGCA_FIXTURES[0]!.date, end_date: EGCA_FIXTURES[EGCA_FIXTURES.length - 1]!.date }))
  for (const t of EGCA_TEAMS) await repo.upsertTeam(t)
  let added = 0
  let alreadyThere = 0
  for (const f of EGCA_FIXTURES) {
    if (await repo.fixtureByRound(season.id, f.date, f.opponentTeam)) {
      alreadyThere++
      continue
    }
    const team = EGCA_TEAMS.find((t) => t.name === f.opponentTeam)
    await repo.addFixture({ season_id: season.id, date: f.date, opponent_team: f.opponentTeam, home: f.home ? 1 : 0, round: f.round, venue: venueOf(team, f.home), start_time: EGCA_START_TIME })
    added++
  }
  return { seasonId: season.id, added, alreadyThere, teams: EGCA_TEAMS.length }
}
