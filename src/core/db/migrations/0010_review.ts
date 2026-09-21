import type { Migration } from './types'

/**
 * Stage 9: weekly review rows (one per ISO week, resumable) and nothing else: focus sessions
 * are `focus` log entries and insights are computed from `log_entries` at read time.
 */
export const m0010: Migration = {
  version: 10,
  name: 'review',
  tables: ['reviews'],
  statements: [
    `CREATE TABLE reviews (
      id TEXT PRIMARY KEY NOT NULL,
      week TEXT NOT NULL UNIQUE,
      step INTEGER NOT NULL DEFAULT 0,
      priorities TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ],
  fixtures: () => {
    const t = '2026-10-04T18:00:00.000Z'
    return {
      reviews: [{ id: 'rv-1', week: '2026-10-05', step: 5, priorities: '["i-4"]', notes: 'Report week', started_at: t, completed_at: '2026-10-04T18:12:00.000Z', created_at: t, updated_at: t }],
      log_entries: [{ id: 'l-11', type: 'focus', module: 'work', ts: '2026-10-02T09:00:00.000Z', ts_end: '2026-10-02T09:25:00.000Z', tz_offset_min: 60, value: 25, unit: 'min', payload: '{"title":"Draft report summary"}', entity_type: 'item', entity_id: 'i-4', created_at: t, updated_at: t }],
    }
  },
}
