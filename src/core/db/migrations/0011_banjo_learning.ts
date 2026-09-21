import type { Migration } from './types'

/**
 * Banjo learning plan: a piece knows how many bars it has and how many are learned from the start;
 * every block of bars learned becomes a chunk with its own spaced-repetition state. Reviews and
 * learning blocks are log entries ('review', 'learn') so insights and consistency can see them.
 *
 * Version 11 was briefly used by the withdrawn fitness migration (release stage-10, never downloaded);
 * a device that ran that build would need its app data cleared before this one.
 */
export const m0011: Migration = {
  version: 11,
  name: 'banjo_learning',
  tables: ['banjo_chunks'],
  statements: [
    `ALTER TABLE banjo_pieces ADD COLUMN bars INTEGER`,
    `ALTER TABLE banjo_pieces ADD COLUMN learned_bars INTEGER NOT NULL DEFAULT 0`,
    `CREATE TABLE banjo_chunks (
      id TEXT PRIMARY KEY NOT NULL,
      piece_id TEXT NOT NULL REFERENCES banjo_pieces(id) ON DELETE CASCADE,
      from_bar INTEGER NOT NULL,
      to_bar INTEGER NOT NULL,
      due TEXT NOT NULL,
      interval_days REAL NOT NULL DEFAULT 1,
      ease REAL NOT NULL DEFAULT 2.5,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      last_reviewed TEXT,
      last_quality INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_banjo_chunks_due ON banjo_chunks(piece_id, due)`,
  ],
  fixtures: () => {
    const t = '2026-10-08T18:00:00.000Z'
    return {
      banjo_pieces: [{ id: 'bp-2', title: 'Salt Creek', tuning: 'gDGBD', status: 'learning', notes: '', bars: 32, learned_bars: 8, created_at: t, updated_at: t }],
      banjo_chunks: [
        { id: 'bc-1', piece_id: 'bp-2', from_bar: 1, to_bar: 4, due: '2026-10-12', interval_days: 3, ease: 2.55, reps: 1, lapses: 0, last_reviewed: '2026-10-09', last_quality: 3, created_at: t, updated_at: t },
        { id: 'bc-2', piece_id: 'bp-2', from_bar: 5, to_bar: 8, due: '2026-10-10', interval_days: 1, ease: 2.5, reps: 0, lapses: 0, last_reviewed: null, last_quality: null, created_at: t, updated_at: t },
      ],
      log_entries: [
        { id: 'l-20', type: 'learn', module: 'banjo', ts: '2026-10-09T18:30:00.000Z', ts_end: null, tz_offset_min: 60, value: 4, unit: 'bars', payload: '{"from_bar":5,"to_bar":8,"piece_id":"bp-2"}', entity_type: 'banjo.piece', entity_id: 'bp-2', created_at: t, updated_at: t },
        { id: 'l-21', type: 'review', module: 'banjo', ts: '2026-10-09T18:10:00.000Z', ts_end: null, tz_offset_min: 60, value: 3, unit: 'quality', payload: '{"piece_id":"bp-2","from_bar":1,"to_bar":4,"interval_before":1,"interval_after":3}', entity_type: 'banjo.chunk', entity_id: 'bc-1', created_at: t, updated_at: t },
      ],
    }
  },
}
