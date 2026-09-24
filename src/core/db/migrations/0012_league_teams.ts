import type { Migration } from './types'

/**
 * League fixtures gain home/away, a round number, a venue and a start time; `league_teams` holds the opposition
 * directory (club, where they play, which night, who to ring). Shared by chess and snooker.
 */
export const m0012: Migration = {
  version: 12,
  name: 'league_teams',
  tables: ['league_teams'],
  statements: [
    `ALTER TABLE league_fixtures ADD COLUMN home INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE league_fixtures ADD COLUMN round INTEGER`,
    `ALTER TABLE league_fixtures ADD COLUMN venue TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE league_fixtures ADD COLUMN start_time TEXT NOT NULL DEFAULT ''`,
    `CREATE TABLE league_teams (
      id TEXT PRIMARY KEY NOT NULL,
      module TEXT NOT NULL,
      name TEXT NOT NULL,
      club TEXT NOT NULL DEFAULT '',
      venue TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      night TEXT NOT NULL DEFAULT '',
      captain TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (module, name)
    )`,
  ],
  fixtures: () => {
    const t = '2026-09-24T09:00:00.000Z'
    return {
      league_teams: [{ id: 'lt-1', module: 'chess', name: 'Castles', club: 'Cardiff Chess Club', venue: 'YMCA Community Centre', address: '2 Shakespeare Street, Cardiff, CF24 3ES', night: 'Tue/Wed', captain: 'Guy Wagner', phone: '07429 425745', email: 'guywagner@btopenworld.com', notes: '', created_at: t, updated_at: t }],
    }
  },
}
