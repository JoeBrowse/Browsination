import type { SqlDriver } from '../db/driver'
import { wallClockToDate } from '../notifications/planner'
import type { ItemRow } from '../repos/items'
import { addDays, type LocalDay } from '../time/localDay'

const OPEN = `status IN ('inbox','todo','waiting')`
const ORDER = `ORDER BY priority DESC, due_date IS NULL, due_date, due_time IS NULL, due_time, created_at`

/** Instant range [start of day, start of next day) in the device zone. */
export function dayRange(day: LocalDay): { from: string; to: string } {
  return { from: wallClockToDate(`${day}T00:00`)!.toISOString(), to: wallClockToDate(`${addDays(day, 1)}T00:00`)!.toISOString() }
}

/** Task-shaped reads over `items`. Today, Inbox segments, digests and the wins log all use these. */
export function taskQueries(db: SqlDriver) {
  const q = (sql: string, params: (string | number | null)[] = []) => db.query<ItemRow>(sql, params)
  return {
    overdue: (today: LocalDay) => q(`SELECT * FROM items WHERE status = 'todo' AND due_date < ? ${ORDER}`, [today]),
    dueOn: (day: LocalDay) => q(`SELECT * FROM items WHERE status = 'todo' AND due_date = ? ${ORDER}`, [day]),
    dueBetween: (from: LocalDay, to: LocalDay) => q(`SELECT * FROM items WHERE status = 'todo' AND due_date > ? AND due_date <= ? ${ORDER}`, [from, to]),
    chaseDue: (today: LocalDay) => q(`SELECT * FROM items WHERE status = 'waiting' AND chase_date IS NOT NULL AND chase_date <= ? ${ORDER}`, [today]),
    focus: (day: LocalDay) => q(`SELECT * FROM items WHERE focus_date = ? AND ${OPEN} ${ORDER}`, [day]),
    open: () => q(`SELECT * FROM items WHERE ${OPEN} ${ORDER}`),
    withReminders: () => q(`SELECT * FROM items WHERE ${OPEN} AND reminder_at IS NOT NULL`),
    doneBetween: (fromIso: string, toIso: string) =>
      q(`SELECT * FROM items WHERE status = 'done' AND completed_at >= ? AND completed_at < ? ORDER BY completed_at DESC`, [fromIso, toIso]),
    recentDone: (limit = 200) => q(`SELECT * FROM items WHERE status = 'done' ORDER BY completed_at DESC LIMIT ?`, [limit]),
    async setFocus(id: string, day: LocalDay | null): Promise<void> {
      await db.run(`UPDATE items SET focus_date = ?, updated_at = ? WHERE id = ?`, [day, new Date().toISOString(), id])
    },
    async counts(today: LocalDay) {
      const n = async (sql: string, params: (string | number | null)[]) => (await db.query<{ n: number }>(sql, params))[0]?.n ?? 0
      const r = dayRange(today)
      return {
        dueToday: await n(`SELECT COUNT(*) AS n FROM items WHERE status = 'todo' AND due_date = ?`, [today]),
        overdue: await n(`SELECT COUNT(*) AS n FROM items WHERE status = 'todo' AND due_date < ?`, [today]),
        focus: await n(`SELECT COUNT(*) AS n FROM items WHERE focus_date = ? AND ${OPEN}`, [today]),
        doneToday: await n(`SELECT COUNT(*) AS n FROM items WHERE status = 'done' AND completed_at >= ? AND completed_at < ?`, [r.from, r.to]),
        dueTomorrow: await n(`SELECT COUNT(*) AS n FROM items WHERE status = 'todo' AND due_date = ?`, [addDays(today, 1)]),
        inbox: await n(`SELECT COUNT(*) AS n FROM items WHERE status = 'inbox'`, []),
        chase: await n(`SELECT COUNT(*) AS n FROM items WHERE status = 'waiting' AND chase_date IS NOT NULL AND chase_date <= ?`, [today]),
      }
    },
  }
}

export type TaskQueries = ReturnType<typeof taskQueries>
export type TaskCounts = Awaited<ReturnType<TaskQueries['counts']>>
