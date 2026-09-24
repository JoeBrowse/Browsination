import type { SqlDriver } from '@/core/db/driver'
import { newId, nowIso } from '@/core/ids'
import { deleteRow, getRow, insertRow, updateRow } from '@/core/repos/base'
import { logEntriesRepo, type LogEntry } from '@/core/repos/logEntries'
import { logDayRange, stampAt, stampNow, todayLocal, type LocalDay } from '@/core/time/localDay'

export interface HabitRow {
  id: string
  name: string
  target_per_week: number
  sort_order: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

/** Log types owned by this module. All rows live in log_entries with module 'brain'. */
export const LOG = {
  mood: 'mood', // value 1-5, payload { note? }
  sleep: 'sleep', // value hours, payload { bed_at, wake_at, quality 1-5 }; ts = wake instant
  meditation: 'meditation', // value minutes
  stretch: 'stretch', // value 1
  habit: 'habit', // value 1, entity_type 'brain.habit', entity_id habit id
} as const

export const HABIT_ENTITY = 'brain.habit'

/** Now for today, midday for an earlier day, so a backdated entry lands on the day it belongs to. */
export function stampFor(day: LocalDay, dayStartHour: number): { ts: string; tz_offset_min: number } {
  return day === todayLocal(new Date(), dayStartHour) ? stampNow() : stampAt(day, '12:00')
}

export function brainRepo(db: SqlDriver) {
  const logs = logEntriesRepo(db)
  const range = (day: LocalDay, dayStartHour: number) => logDayRange(day, dayStartHour)

  return {
    logs,
    async createHabit(name: string, target_per_week = 7): Promise<HabitRow> {
      const t = nowIso()
      const count = (await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM habits'))[0]?.n ?? 0
      const row: HabitRow = { id: newId(), name: name.trim(), target_per_week, sort_order: count, archived_at: null, created_at: t, updated_at: t }
      await insertRow(db, 'habits', row)
      return row
    },
    getHabit: (id: string) => getRow<HabitRow>(db, 'habits', id),
    updateHabit: (id: string, patch: Partial<Omit<HabitRow, 'id' | 'created_at'>>) => updateRow(db, 'habits', id, { ...patch, updated_at: nowIso() }),
    removeHabit: (id: string) => deleteRow(db, 'habits', id),
    listHabits: (includeArchived = false) =>
      db.query<HabitRow>(`SELECT * FROM habits ${includeArchived ? '' : 'WHERE archived_at IS NULL'} ORDER BY sort_order, created_at`),

    /** Entries of one type inside a local day (day-start rule applied). */
    entriesOn(type: string, day: LocalDay, dayStartHour: number): Promise<LogEntry[]> {
      const r = range(day, dayStartHour)
      return logs.listByType(type, r.from, r.to)
    },
    /** Habit ticks for a day, keyed by habit id. */
    async habitTicksOn(day: LocalDay, dayStartHour: number): Promise<Map<string, LogEntry>> {
      const out = new Map<string, LogEntry>()
      for (const e of await this.entriesOn(LOG.habit, day, dayStartHour)) if (e.entity_id) out.set(e.entity_id, e)
      return out
    },
    /** One-per-day types (mood, sleep, stretch): update that day's entry if present, else add. */
    async upsertDaily(type: string, day: LocalDay, dayStartHour: number, input: { value?: number | null; unit?: string | null; payload?: Record<string, unknown>; ts?: string }): Promise<LogEntry> {
      const existing = (await this.entriesOn(type, day, dayStartHour))[0]
      if (existing) {
        await logs.update(existing.id, { value: input.value ?? existing.value, unit: input.unit ?? existing.unit, payload: { ...existing.payload, ...(input.payload ?? {}) }, ...(input.ts ? { ts: input.ts } : {}) })
        return (await logs.get(existing.id))!
      }
      const stamp = input.ts ? { ts: input.ts } : stampFor(day, dayStartHour)
      return logs.add({ type, module: 'brain', value: input.value ?? null, unit: input.unit ?? null, payload: input.payload ?? {}, ...stamp })
    },
    /** Ticks and un-ticks a habit on a day; filling in an earlier day stamps the tick on that day. */
    async toggleHabit(habitId: string, day: LocalDay, dayStartHour: number): Promise<boolean> {
      const tick = (await this.habitTicksOn(day, dayStartHour)).get(habitId)
      if (tick) {
        await logs.remove(tick.id)
        return false
      }
      const habit = await getRow<HabitRow>(db, 'habits', habitId)
      await logs.add({ type: LOG.habit, module: 'brain', value: 1, entity_type: HABIT_ENTITY, entity_id: habitId, payload: habit ? { name: habit.name } : {}, ...stampFor(day, dayStartHour) })
      return true
    },
    /** Stamps of a habit (or any type) since an instant, for consistency maths. */
    stampsFor(type: string, fromTs: string, entityId?: string): Promise<{ ts: string; tz_offset_min: number }[]> {
      return entityId
        ? db.query<{ ts: string; tz_offset_min: number }>('SELECT ts, tz_offset_min FROM log_entries WHERE type = ? AND entity_id = ? AND ts >= ?', [type, entityId, fromTs])
        : logs.stampsOfType(type, fromTs)
    },
  }
}

export type BrainRepo = ReturnType<typeof brainRepo>
