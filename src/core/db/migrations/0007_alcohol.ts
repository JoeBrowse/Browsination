import type { Migration } from './types'

/**
 * Stage 6: drinks, caffeine and medication doses are log_entries; only medication definitions
 * (name, dose, reminder times) need a table.
 */
export const m0007: Migration = {
  version: 7,
  name: 'alcohol',
  tables: ['medications'],
  statements: [
    `CREATE TABLE medications (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      dose TEXT NOT NULL DEFAULT '',
      times TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ],
  fixtures: () => {
    const t = '2026-09-25T09:00:00.000Z'
    return {
      medications: [{ id: 'md-1', name: 'Vitamin D', dose: '1000 IU', times: '["08:00"]', active: 1, notes: '', created_at: t, updated_at: t }],
      log_entries: [
        { id: 'l-6', type: 'drink', module: 'alcohol', ts: '2026-09-25T19:00:00.000Z', ts_end: null, tz_offset_min: 60, value: 20.2, unit: 'g', payload: '{"units":2.56,"volume_ml":568,"abv":4.5,"preset":"pint","name":"Pint 4.5%"}', entity_type: null, entity_id: null, created_at: t, updated_at: t },
        { id: 'l-7', type: 'caffeine', module: 'alcohol', ts: '2026-09-25T08:00:00.000Z', ts_end: null, tz_offset_min: 60, value: 95, unit: 'mg', payload: '{"preset":"coffee","name":"Coffee"}', entity_type: null, entity_id: null, created_at: t, updated_at: t },
        { id: 'l-8', type: 'medication', module: 'alcohol', ts: '2026-09-25T08:05:00.000Z', ts_end: null, tz_offset_min: 60, value: 1, unit: null, payload: '{"name":"Vitamin D","dose":"1000 IU"}', entity_type: 'alcohol.medication', entity_id: 'md-1', created_at: t, updated_at: t },
        { id: 'l-9', type: 'morning_after', module: 'alcohol', ts: '2026-09-26T08:00:00.000Z', ts_end: null, tz_offset_min: 60, value: 3, unit: 'score', payload: '{"units_previous_day":2.56}', entity_type: null, entity_id: null, created_at: t, updated_at: t },
      ],
    }
  },
}
