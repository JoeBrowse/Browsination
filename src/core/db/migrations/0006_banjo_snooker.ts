import type { Migration } from './types'

/**
 * Stage 5: banjo and snooker. Practice sessions, routine attempts and breaks are log_entries;
 * sheet music lives on disk with a `files` row (module 'banjo', entity 'banjo.piece').
 */
export const m0006: Migration = {
  version: 6,
  name: 'banjo_snooker',
  tables: ['banjo_pieces', 'banjo_goals', 'snooker_routines'],
  statements: [
    `CREATE TABLE banjo_pieces (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      tuning TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'learning' CHECK (status IN ('learning','polishing','performance-ready')),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE banjo_goals (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'piece' CHECK (kind IN ('piece','technique')),
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','done')),
      notes TEXT NOT NULL DEFAULT '',
      piece_id TEXT REFERENCES banjo_pieces(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE snooker_routines (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'score',
      sort_order INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ],
  fixtures: () => {
    const t = '2026-09-24T09:00:00.000Z'
    return {
      banjo_pieces: [{ id: 'bp-1', title: 'Cripple Creek', tuning: 'gDGBD', status: 'polishing', notes: '', created_at: t, updated_at: t }],
      banjo_goals: [{ id: 'bg-1', title: 'Foggy Mountain Breakdown', kind: 'piece', target_date: '2026-12-31', status: 'active', notes: '', piece_id: 'bp-1', created_at: t, updated_at: t }],
      snooker_routines: [{ id: 'sr-1', name: 'Line-up', description: 'Colours on spots, reds in a line', unit: 'score', sort_order: 0, archived_at: null, created_at: t, updated_at: t }],
      log_entries: [
        { id: 'l-3', type: 'practice', module: 'banjo', ts: '2026-09-24T18:00:00.000Z', ts_end: '2026-09-24T18:25:00.000Z', tz_offset_min: 60, value: 25, unit: 'min', payload: '{"worked_on":"rolls","piece_id":"bp-1"}', entity_type: 'banjo.piece', entity_id: 'bp-1', created_at: t, updated_at: t },
        { id: 'l-4', type: 'routine_attempt', module: 'snooker', ts: '2026-09-24T19:00:00.000Z', ts_end: null, tz_offset_min: 60, value: 42, unit: 'score', payload: '{}', entity_type: 'snooker.routine', entity_id: 'sr-1', created_at: t, updated_at: t },
        { id: 'l-5', type: 'break', module: 'snooker', ts: '2026-09-24T19:30:00.000Z', ts_end: null, tz_offset_min: 60, value: 31, unit: 'points', payload: '{}', entity_type: null, entity_id: null, created_at: t, updated_at: t },
      ],
    }
  },
}
