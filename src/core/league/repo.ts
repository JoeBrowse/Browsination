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

export interface FixtureRow {
  id: string
  season_id: string
  module: string
  date: string
  opponent: string
  opponent_team: string
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
    fixturesOn: (day: string) => db.query<FixtureRow>('SELECT * FROM league_fixtures WHERE module = ? AND date = ?', [module, day]),
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
