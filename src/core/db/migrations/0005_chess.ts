import type { Migration } from './types'

/**
 * Stage 4: chess. Calendars are iCalendar feeds (Google's per-calendar secret address) cached locally.
 * League tables carry a `module` column so snooker (Stage 5) shares them.
 */
export const m0005: Migration = {
  version: 5,
  name: 'chess',
  tables: ['calendars', 'calendar_events', 'students', 'lesson_templates', 'lessons', 'repertoire', 'tournaments', 'league_seasons', 'league_fixtures'],
  statements: [
    `CREATE TABLE calendars (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE calendar_events (
      id TEXT PRIMARY KEY NOT NULL,
      calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
      uid TEXT NOT NULL,
      summary TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      start_ts TEXT NOT NULL,
      end_ts TEXT NOT NULL,
      all_day INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_calendar_events_start ON calendar_events(start_ts)`,
    `CREATE INDEX idx_calendar_events_cal ON calendar_events(calendar_id, start_ts)`,
    `CREATE TABLE students (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      level TEXT NOT NULL DEFAULT '',
      goals TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE lesson_templates (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE lessons (
      id TEXT PRIMARY KEY NOT NULL,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      event_id TEXT,
      date TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT '',
      notes_after TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_lessons_student ON lessons(student_id, date)`,
    `CREATE TABLE repertoire (
      id TEXT PRIMARY KEY NOT NULL,
      colour TEXT NOT NULL CHECK (colour IN ('white','black')),
      parent_id TEXT REFERENCES repertoire(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      pgn TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      confidence INTEGER NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 1 AND 5),
      last_reviewed TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_repertoire_parent ON repertoire(colour, parent_id, sort_order)`,
    `CREATE TABLE tournaments (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      location TEXT NOT NULL DEFAULT '',
      entry_deadline TEXT,
      entry_fee_pence INTEGER,
      entered TEXT NOT NULL DEFAULT 'no' CHECK (entered IN ('no','yes','skipped')),
      url TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_tournaments_deadline ON tournaments(entered, entry_deadline)`,
    `CREATE TABLE league_seasons (
      id TEXT PRIMARY KEY NOT NULL,
      module TEXT NOT NULL,
      name TEXT NOT NULL,
      team TEXT NOT NULL DEFAULT '',
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE league_fixtures (
      id TEXT PRIMARY KEY NOT NULL,
      season_id TEXT NOT NULL REFERENCES league_seasons(id) ON DELETE CASCADE,
      module TEXT NOT NULL,
      date TEXT NOT NULL,
      opponent TEXT NOT NULL DEFAULT '',
      opponent_team TEXT NOT NULL DEFAULT '',
      board INTEGER,
      colour TEXT CHECK (colour IN ('white','black')),
      result REAL CHECK (result IN (1, 0.5, 0)),
      my_rating INTEGER,
      opponent_rating INTEGER,
      pgn TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_league_fixtures_season ON league_fixtures(season_id, date)`,
  ],
  fixtures: () => {
    const t = '2026-09-23T09:00:00.000Z'
    return {
      calendars: [{ id: 'c-1', name: 'Lessons', url: 'https://calendar.google.com/calendar/ical/x/private-abc/basic.ics', enabled: 1, last_synced_at: t, last_error: null, created_at: t, updated_at: t }],
      calendar_events: [{ id: 'ev-1', calendar_id: 'c-1', uid: 'u1@google.com', summary: 'Lesson: Tom', location: 'Online', description: '', start_ts: '2026-09-24T16:00:00.000Z', end_ts: '2026-09-24T17:00:00.000Z', all_day: 0, created_at: t, updated_at: t }],
      students: [{ id: 's-1', person_id: 'p-1', level: '1200', goals: 'Stop hanging pieces', notes: '', active: 1, created_at: t, updated_at: t }],
      lesson_templates: [{ id: 'lt-1', title: 'Tactics warm-up', body: '10 puzzles, then review last game', created_at: t, updated_at: t }],
      lessons: [{ id: 'ls-1', student_id: 's-1', event_id: 'ev-1', date: '2026-09-24', plan: 'Endgame basics', notes_after: '', created_at: t, updated_at: t }],
      repertoire: [
        { id: 'r-1', colour: 'white', parent_id: null, name: 'London System', pgn: '1. d4 d5 2. Bf4', notes: '', confidence: 3, last_reviewed: '2026-09-01', sort_order: 0, created_at: t, updated_at: t },
        { id: 'r-2', colour: 'white', parent_id: 'r-1', name: 'vs ...c5', pgn: '1. d4 d5 2. Bf4 c5 3. e3', notes: 'Keep the bishop', confidence: 2, last_reviewed: null, sort_order: 0, created_at: t, updated_at: t },
      ],
      tournaments: [{ id: 'tn-1', name: 'Cardiff Open', start_date: '2026-11-07', end_date: '2026-11-08', location: 'Cardiff', entry_deadline: '2026-10-31', entry_fee_pence: 3500, entered: 'no', url: null, notes: '', created_at: t, updated_at: t }],
      league_seasons: [{ id: 'se-1', module: 'chess', name: '2026/27', team: 'Cardiff Crows', start_date: '2026-09-01', end_date: '2027-04-30', created_at: t, updated_at: t }],
      league_fixtures: [{ id: 'fx-1', season_id: 'se-1', module: 'chess', date: '2026-09-22', opponent: 'A. Jones', opponent_team: 'Newport', board: 3, colour: 'white', result: 1, my_rating: 1650, opponent_rating: 1600, pgn: '', notes: '', created_at: t, updated_at: t }],
    }
  },
}
