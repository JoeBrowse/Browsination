import type { SqlDriver } from '../db/driver'
import { newId, nowIso } from '../ids'
import { getRow, insertRow, parseJson, updateRow } from '../repos/base'
import type { LocalDay } from '../time/localDay'

export interface ReviewRow {
  id: string
  /** Monday of the week the review is for. */
  week: LocalDay
  step: number
  /** JSON string[] of item ids picked as this week's priorities. */
  priorities: string
  notes: string
  started_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export function reviewRepo(db: SqlDriver) {
  return {
    forWeek: async (week: LocalDay) => (await db.query<ReviewRow>('SELECT * FROM reviews WHERE week = ?', [week]))[0] ?? null,
    get: (id: string) => getRow<ReviewRow>(db, 'reviews', id),
    latest: async () => (await db.query<ReviewRow>('SELECT * FROM reviews ORDER BY week DESC LIMIT 1'))[0] ?? null,
    completedWeeks: async (limit = 8) => (await db.query<{ week: LocalDay }>('SELECT week FROM reviews WHERE completed_at IS NOT NULL ORDER BY week DESC LIMIT ?', [limit])).map((r) => r.week),
    /** Returns the existing review for the week or starts one. */
    async start(week: LocalDay): Promise<ReviewRow> {
      const existing = (await db.query<ReviewRow>('SELECT * FROM reviews WHERE week = ?', [week]))[0]
      if (existing) return existing
      const t = nowIso()
      const row: ReviewRow = { id: newId(), week, step: 0, priorities: '[]', notes: '', started_at: t, completed_at: null, created_at: t, updated_at: t }
      await insertRow(db, 'reviews', row)
      return row
    },
    setStep: (id: string, step: number) => updateRow(db, 'reviews', id, { step, updated_at: nowIso() }),
    setPriorities: (id: string, ids: string[]) => updateRow(db, 'reviews', id, { priorities: JSON.stringify(ids), updated_at: nowIso() }),
    setNotes: (id: string, notes: string) => updateRow(db, 'reviews', id, { notes, updated_at: nowIso() }),
    complete: (id: string) => updateRow(db, 'reviews', id, { completed_at: nowIso(), step: 5, updated_at: nowIso() }),
    reopen: (id: string) => updateRow(db, 'reviews', id, { completed_at: null, updated_at: nowIso() }),
    priorityIds: (r: ReviewRow): string[] => parseJson<string[]>(r.priorities, []).filter((x) => typeof x === 'string'),
  }
}

export type ReviewRepo = ReturnType<typeof reviewRepo>
