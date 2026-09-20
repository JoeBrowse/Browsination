import type { Migration } from './types'

/**
 * Stage 2: habits. Check-in entries (mood, sleep, meditation, stretch) and habit ticks all live in
 * log_entries; this table only defines the habits themselves.
 */
export const m0003: Migration = {
  version: 3,
  name: 'brain',
  tables: ['habits'],
  statements: [
    `CREATE TABLE habits (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      target_per_week INTEGER NOT NULL DEFAULT 7,
      sort_order INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ],
  fixtures: () => {
    const t = '2026-09-21T09:00:00.000Z'
    return {
      habits: [{ id: 'h-1', name: 'Read', target_per_week: 5, sort_order: 0, archived_at: null, created_at: t, updated_at: t }],
      log_entries: [
        {
          id: 'l-2',
          type: 'habit',
          module: 'brain',
          ts: t,
          ts_end: null,
          tz_offset_min: 60,
          value: 1,
          unit: null,
          payload: '{}',
          entity_type: 'brain.habit',
          entity_id: 'h-1',
          created_at: t,
          updated_at: t,
        },
      ],
    }
  },
}
