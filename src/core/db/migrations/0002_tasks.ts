import type { Migration } from './types'

/**
 * Stage 1: waiting-on, focus list, recurring series.
 *  - waiting_person_id / chase_date: status 'waiting' shows on Today once chase_date arrives
 *  - focus_date: the calendar day this item was picked for the focus list (max 5 per day)
 *  - series_id: recurring items roll forward by inserting the next occurrence with the same series id
 *  - recur_from: 'due' = next occurrence from the due date; 'done' = from the completion day
 */
export const m0002: Migration = {
  version: 2,
  name: 'tasks',
  statements: [
    `ALTER TABLE items ADD COLUMN waiting_person_id TEXT REFERENCES people(id) ON DELETE SET NULL`,
    `ALTER TABLE items ADD COLUMN chase_date TEXT`,
    `ALTER TABLE items ADD COLUMN focus_date TEXT`,
    `ALTER TABLE items ADD COLUMN series_id TEXT`,
    `ALTER TABLE items ADD COLUMN recur_from TEXT NOT NULL DEFAULT 'due'`,
    `CREATE INDEX idx_items_focus ON items(focus_date)`,
    `CREATE INDEX idx_items_completed ON items(completed_at)`,
    `CREATE INDEX idx_items_chase ON items(status, chase_date)`,
  ],
  fixtures: () => {
    const t = '2026-09-21T09:00:00.000Z'
    return {
      items: [
        {
          id: 'i-2',
          title: 'Chase plumber quote',
          notes: '',
          module: 'life',
          status: 'waiting',
          due_date: null,
          due_time: null,
          reminder_at: null,
          recurrence: 'FREQ=WEEKLY;BYDAY=MO',
          priority: 1,
          entity_type: null,
          entity_id: null,
          created_at: t,
          updated_at: t,
          completed_at: null,
          waiting_person_id: 'p-1',
          chase_date: '2026-09-28',
          focus_date: '2026-09-21',
          series_id: 'i-2',
          recur_from: 'done',
        },
      ],
    }
  },
}
