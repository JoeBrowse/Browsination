import type { Migration } from './types'

/**
 * Stage 3: personal life. Lists are views over items (module 'life', entity_type 'life.list').
 * Trip checklists are items linked to a trip (entity_type 'life.trip'). No sensitive ID numbers anywhere:
 * admin_items hold names, dates, cost and where the document lives.
 */
export const m0004: Migration = {
  version: 4,
  name: 'life',
  tables: ['buy_details', 'date_nights', 'trips', 'flight_prices', 'admin_items'],
  statements: [
    `ALTER TABLE people ADD COLUMN keep_in_touch_days INTEGER`,
    `CREATE TABLE buy_details (
      item_id TEXT PRIMARY KEY NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      price_pence INTEGER,
      url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE date_nights (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','planned','done','skipped')),
      date TEXT,
      place TEXT NOT NULL DEFAULT '',
      budget_pence INTEGER,
      spent_pence INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_date_nights_status ON date_nights(status, date)`,
    `CREATE TABLE trips (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      destination TEXT NOT NULL DEFAULT '',
      start_date TEXT,
      end_date TEXT,
      budget_pence INTEGER,
      spent_pence INTEGER,
      booking_refs TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('idea','planned','done')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_trips_start ON trips(status, start_date)`,
    `CREATE TABLE flight_prices (
      id TEXT PRIMARY KEY NOT NULL,
      trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      checked_on TEXT NOT NULL,
      route TEXT NOT NULL,
      price_pence INTEGER NOT NULL,
      url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_flight_prices_trip ON flight_prices(trip_id, checked_on)`,
    `CREATE TABLE admin_items (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('renewal','health','subscription','document')),
      name TEXT NOT NULL,
      due_date TEXT,
      recurrence TEXT,
      cost_pence INTEGER,
      location TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      last_done TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_admin_due ON admin_items(kind, due_date)`,
  ],
  fixtures: () => {
    const t = '2026-09-22T09:00:00.000Z'
    return {
      items: [
        {
          id: 'i-3',
          title: 'Standing lamp',
          notes: '',
          module: 'life',
          status: 'todo',
          due_date: null,
          due_time: null,
          reminder_at: null,
          recurrence: null,
          priority: 0,
          entity_type: 'life.list',
          entity_id: 'buy',
          created_at: t,
          updated_at: t,
          completed_at: null,
          waiting_person_id: null,
          chase_date: null,
          focus_date: null,
          series_id: null,
          recur_from: 'due',
        },
      ],
      buy_details: [{ item_id: 'i-3', price_pence: 4599, url: 'https://example.com/lamp', created_at: t, updated_at: t }],
      date_nights: [{ id: 'd-1', title: 'Jazz night', status: 'planned', date: '2026-10-03', place: 'Cardiff', budget_pence: 6000, spent_pence: null, notes: '', created_at: t, updated_at: t }],
      trips: [
        {
          id: 't-1',
          name: 'Lisbon',
          destination: 'Lisbon, PT',
          start_date: '2026-11-10',
          end_date: '2026-11-14',
          budget_pence: 80000,
          spent_pence: 21000,
          booking_refs: '[{"label":"Hotel","ref":"ABC123"}]',
          notes: '',
          status: 'planned',
          created_at: t,
          updated_at: t,
        },
      ],
      flight_prices: [{ id: 'fp-1', trip_id: 't-1', checked_on: '2026-09-22', route: 'BRS-LIS', price_pence: 9800, url: null, created_at: t, updated_at: t }],
      admin_items: [
        { id: 'a-1', kind: 'renewal', name: 'Passport', due_date: '2029-03-01', recurrence: null, cost_pence: null, location: 'Desk drawer', notes: '', last_done: null, created_at: t, updated_at: t },
        { id: 'a-2', kind: 'health', name: 'Dentist', due_date: '2026-11-01', recurrence: 'FREQ=MONTHLY;INTERVAL=6', cost_pence: null, location: '', notes: '', last_done: '2026-05-01', created_at: t, updated_at: t },
      ],
    }
  },
}
