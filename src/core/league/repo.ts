import type { SqlDriver } from '../db/driver'
import { newId, nowIso } from '../ids'
import { deleteRow, getRow, insertRow, updateRow } from '../repos/base'
import { logEntriesRepo } from '../repos/logEntries'

/** League tables are shared by chess and snooker; `module` keeps them apart. */
export interface SeasonRow {
  id: string
  module: string
  name: string
  team: string
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

/** The opposition directory: where a team plays, which night, and who to ring. */
export interface TeamRow {
  id: string
  module: string
  name: string
  club: string
  venue: string
  address: string
  night: string
  captain: string
  phone: string
  email: string
  notes: string
  created_at: string
  updated_at: string
}

export interface FixtureRow {
  id: string
  season_id: string
  module: string
  date: string
  opponent: string
  opponent_team: string
  /** 1 at our place, 0 at theirs. */
  home: number
  round: number | null
  venue: string
  /** Local wall clock 'HH:MM', '' when it is the league's usual time. */
  start_time: string
  board: number | null
  colour: 'white' | 'black' | null
  result: number | null
  my_rating: number | null
  opponent_rating: number | null
  pgn: string
  notes: string
  created_at: string
  updated_at: string
}

export function leagueRepo(db: SqlDriver, module: string) {
  const logs = logEntriesRepo(db)
  return {
    seasons: () => db.query<SeasonRow>('SELECT * FROM league_seasons WHERE module = ? ORDER BY start_date DESC, created_at DESC', [module]),
    season: (id: string) => getRow<SeasonRow>(db, 'league_seasons', id),
    async addSeason(input: { name: string; team?: string; start_date?: string | null; end_date?: string | null }): Promise<SeasonRow> {
      const t = nowIso()
      const row: SeasonRow = { id: newId(), module, name: input.name.trim(), team: input.team ?? '', start_date: input.start_date ?? null, end_date: input.end_date ?? null, created_at: t, updated_at: t }
      await insertRow(db, 'league_seasons', row)
      return row
    },
    updateSeason: (id: string, patch: Partial<Omit<SeasonRow, 'id' | 'module' | 'created_at'>>) => updateRow(db, 'league_seasons', id, { ...patch, updated_at: nowIso() }),
    removeSeason: (id: string) => deleteRow(db, 'league_seasons', id),
    fixtures: (seasonId: string) => db.query<FixtureRow>('SELECT * FROM league_fixtures WHERE season_id = ? ORDER BY date DESC, created_at DESC', [seasonId]),
    fixturesBetween: (from: string, to: string) => db.query<FixtureRow>('SELECT * FROM league_fixtures WHERE module = ? AND date >= ? AND date <= ? ORDER BY date', [module, from, to]),
    fixturesOn: (day: string) => db.query<FixtureRow>('SELECT * FROM league_fixtures WHERE module = ? AND date = ?', [module, day]),
    fixtureByRound: async (seasonId: string, date: string, opponentTeam: string) =>
      (await db.query<FixtureRow>('SELECT * FROM league_fixtures WHERE season_id = ? AND date = ? AND opponent_team = ?', [seasonId, date, opponentTeam]))[0] ?? null,
    nextFixture: async (today: string) => (await db.query<FixtureRow>('SELECT * FROM league_fixtures WHERE module = ? AND date >= ? AND result IS NULL ORDER BY date LIMIT 1', [module, today]))[0] ?? null,
    async addFixture(input: Partial<FixtureRow> & { season_id: string; date: string }): Promise<FixtureRow> {
      const t = nowIso()
      const row: FixtureRow = {
        id: newId(),
        season_id: input.season_id,
        module,
        date: input.date,
        opponent: input.opponent ?? '',
        opponent_team: input.opponent_team ?? '',
        home: input.home ?? 1,
        round: input.round ?? null,
        venue: input.venue ?? '',
        start_time: input.start_time ?? '',
        board: input.board ?? null,
        colour: input.colour ?? null,
        result: input.result ?? null,
        my_rating: input.my_rating ?? null,
        opponent_rating: input.opponent_rating ?? null,
        pgn: input.pgn ?? '',
        notes: input.notes ?? '',
        created_at: t,
        updated_at: t,
      }
      await insertRow(db, 'league_fixtures', row)
      if (row.result !== null) await this.logResult(row)
      return row
    },
    async updateFixture(id: string, patch: Partial<Omit<FixtureRow, 'id' | 'module' | 'created_at'>>): Promise<void> {
      await updateRow(db, 'league_fixtures', id, { ...patch, updated_at: nowIso() })
      if (patch.result !== undefined) {
        const row = await getRow<FixtureRow>(db, 'league_fixtures', id)
        if (row) await this.logResult(row)
      }
    },
    removeFixture: (id: string) => deleteRow(db, 'league_fixtures', id),
    // teams
    teams: () => db.query<TeamRow>('SELECT * FROM league_teams WHERE module = ? ORDER BY name COLLATE NOCASE', [module]),
    team: async (name: string) => (await db.query<TeamRow>('SELECT * FROM league_teams WHERE module = ? AND name = ?', [module, name]))[0] ?? null,
    /** Insert or update by name; blank incoming fields never overwrite something already filled in. */
    async upsertTeam(input: Partial<TeamRow> & { name: string }): Promise<TeamRow> {
      const t = nowIso()
      const existing = (await db.query<TeamRow>('SELECT * FROM league_teams WHERE module = ? AND name = ?', [module, input.name]))[0]
      if (existing) {
        const patch: Partial<TeamRow> = {}
        for (const k of ['club', 'venue', 'address', 'night', 'captain', 'phone', 'email', 'notes'] as const) {
          const v = input[k]
          if (typeof v === 'string' && v !== '') patch[k] = v
        }
        if (Object.keys(patch).length) await updateRow(db, 'league_teams', existing.id, { ...patch, updated_at: t })
        return { ...existing, ...patch }
      }
      const row: TeamRow = { id: newId(), module, name: input.name, club: input.club ?? '', venue: input.venue ?? '', address: input.address ?? '', night: input.night ?? '', captain: input.captain ?? '', phone: input.phone ?? '', email: input.email ?? '', notes: input.notes ?? '', created_at: t, updated_at: t }
      await insertRow(db, 'league_teams', row)
      return row
    },
    updateTeam: (id: string, patch: Partial<Omit<TeamRow, 'id' | 'module' | 'created_at'>>) => updateRow(db, 'league_teams', id, { ...patch, updated_at: nowIso() }),
    removeTeam: (id: string) => deleteRow(db, 'league_teams', id),
    /** One `match_result` log entry per fixture (replaced on change) so insights can correlate results. */
    async logResult(row: FixtureRow): Promise<void> {
      const existing = await db.query<{ id: string }>(`SELECT id FROM log_entries WHERE type = 'match_result' AND entity_type = 'league.fixture' AND entity_id = ?`, [row.id])
      for (const e of existing) await logs.remove(e.id)
      if (row.result === null) return
      const ts = new Date(`${row.date}T19:30:00`).toISOString()
      await logs.add({ type: 'match_result', module, value: row.result, unit: 'points', ts, entity_type: 'league.fixture', entity_id: row.id, payload: { opponent: row.opponent, colour: row.colour, board: row.board } })
    },
  }
}

export type LeagueRepo = ReturnType<typeof leagueRepo>
