import type { Migration } from './types'

/**
 * Core spine. Conventions used by every table in the app:
 *  - id TEXT PRIMARY KEY, generated in code (newId)
 *  - created_at / updated_at as ISO 8601 UTC strings
 *  - instants are ISO UTC strings; civil dates 'YYYY-MM-DD'; civil times 'HH:MM'
 *  - JSON columns are TEXT parsed at the repository boundary
 */
export const m0001: Migration = {
  version: 1,
  name: 'core',
  tables: ['settings', 'people', 'gift_ideas', 'items', 'log_entries', 'files'],
  statements: [
    `CREATE TABLE settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE people (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL DEFAULT '',
      birthday TEXT,
      notes TEXT NOT NULL DEFAULT '',
      last_contacted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_people_birthday ON people(birthday)`,
    `CREATE TABLE gift_ideas (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','done')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_gift_person ON gift_ideas(person_id)`,
    `CREATE TABLE items (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      module TEXT,
      status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','todo','waiting','done','dropped')),
      due_date TEXT,
      due_time TEXT,
      reminder_at TEXT,
      recurrence TEXT,
      priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
      entity_type TEXT,
      entity_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    )`,
    `CREATE INDEX idx_items_status_due ON items(status, due_date)`,
    `CREATE INDEX idx_items_module_status ON items(module, status)`,
    `CREATE INDEX idx_items_entity ON items(entity_type, entity_id)`,
    `CREATE TABLE log_entries (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      module TEXT,
      ts TEXT NOT NULL,
      ts_end TEXT,
      tz_offset_min INTEGER NOT NULL,
      value REAL,
      unit TEXT,
      payload TEXT NOT NULL DEFAULT '{}',
      entity_type TEXT,
      entity_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_log_type_ts ON log_entries(type, ts)`,
    `CREATE INDEX idx_log_module_ts ON log_entries(module, ts)`,
    `CREATE INDEX idx_log_entity ON log_entries(entity_type, entity_id)`,
    `CREATE TABLE files (
      id TEXT PRIMARY KEY NOT NULL,
      module TEXT,
      entity_type TEXT,
      entity_id TEXT,
      rel_path TEXT NOT NULL UNIQUE,
      mime TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_files_entity ON files(entity_type, entity_id)`,
  ],
  fixtures: () => {
    const t = '2026-09-20T10:00:00.000Z'
    return {
      settings: [{ key: 'theme', value: '"dark"', updated_at: t }],
      people: [
        {
          id: 'p-1',
          name: 'Sophie',
          relationship: 'partner',
          birthday: '--05-14',
          notes: 'Likes plants',
          last_contacted_at: t,
          created_at: t,
          updated_at: t,
        },
      ],
      gift_ideas: [{ id: 'g-1', person_id: 'p-1', title: 'Monstera', notes: '', status: 'idea', created_at: t, updated_at: t }],
      items: [
        {
          id: 'i-1',
          title: 'Book dentist',
          notes: 'Ask about the crown',
          module: null,
          status: 'inbox',
          due_date: '2026-09-25',
          due_time: '09:30',
          reminder_at: '2026-09-25T09:00',
          recurrence: 'FREQ=MONTHLY;INTERVAL=6',
          priority: 2,
          entity_type: null,
          entity_id: null,
          created_at: t,
          updated_at: t,
          completed_at: null,
        },
      ],
      log_entries: [
        {
          id: 'l-1',
          type: 'mood',
          module: 'brain',
          ts: t,
          ts_end: null,
          tz_offset_min: 60,
          value: 4,
          unit: 'score',
          payload: '{"note":"good sleep"}',
          entity_type: null,
          entity_id: null,
          created_at: t,
          updated_at: t,
        },
      ],
      files: [
        {
          id: 'f-1',
          module: 'banjo',
          entity_type: 'banjo.piece',
          entity_id: 'piece-1',
          rel_path: 'files/banjo/f-1.pdf',
          mime: 'application/pdf',
          title: 'Cripple Creek',
          created_at: t,
          updated_at: t,
        },
      ],
    }
  },
}
