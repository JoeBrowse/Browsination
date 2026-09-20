import type { SqlDriver } from '@/core/db/driver'
import { newId, nowIso } from '@/core/ids'
import { leagueRepo } from '@/core/league/repo'
import { deleteRow, getRow, insertRow, updateRow } from '@/core/repos/base'
import { logEntriesRepo, type LogEntry } from '@/core/repos/logEntries'

export interface RoutineRow {
  id: string
  name: string
  description: string
  unit: string
  sort_order: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export const LOG = { attempt: 'routine_attempt', break: 'break' } as const
export const ROUTINE_ENTITY = 'snooker.routine'

export function snookerRepo(db: SqlDriver) {
  const logs = logEntriesRepo(db)
  return {
    logs,
    league: leagueRepo(db, 'snooker'),
    routines: (includeArchived = false) => db.query<RoutineRow>(`SELECT * FROM snooker_routines ${includeArchived ? '' : 'WHERE archived_at IS NULL'} ORDER BY sort_order, created_at`),
    routine: (id: string) => getRow<RoutineRow>(db, 'snooker_routines', id),
    async addRoutine(name: string, description = '', unit = 'score'): Promise<RoutineRow> {
      const t = nowIso()
      const count = (await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM snooker_routines'))[0]?.n ?? 0
      const row: RoutineRow = { id: newId(), name: name.trim(), description, unit, sort_order: count, archived_at: null, created_at: t, updated_at: t }
      await insertRow(db, 'snooker_routines', row)
      return row
    },
    updateRoutine: (id: string, patch: Partial<Omit<RoutineRow, 'id' | 'created_at'>>) => updateRow(db, 'snooker_routines', id, { ...patch, updated_at: nowIso() }),
    removeRoutine: (id: string) => deleteRow(db, 'snooker_routines', id),
    /** Attempts for a routine, oldest first. */
    attempts: async (routineId: string, limit = 500): Promise<LogEntry[]> => {
      const rows = await db.query<{ id: string }>(`SELECT id FROM log_entries WHERE type = ? AND entity_id = ? ORDER BY ts DESC LIMIT ?`, [LOG.attempt, routineId, limit])
      const out: LogEntry[] = []
      for (const r of rows.reverse()) {
        const e = await logs.get(r.id)
        if (e) out.push(e)
      }
      return out
    },
    attemptValues: (routineId: string, limit = 500) =>
      db
        .query<{ value: number }>(`SELECT value FROM log_entries WHERE type = ? AND entity_id = ? AND value IS NOT NULL ORDER BY ts DESC LIMIT ?`, [LOG.attempt, routineId, limit])
        .then((rows) => rows.map((r) => r.value).reverse()),
    logAttempt: (routine: RoutineRow, value: number, note = '') =>
      logs.add({ type: LOG.attempt, module: 'snooker', value, unit: routine.unit, entity_type: ROUTINE_ENTITY, entity_id: routine.id, payload: note ? { note } : {} }),
    removeEntry: (id: string) => logs.remove(id),
    logBreak: (points: number, note = '') => logs.add({ type: LOG.break, module: 'snooker', value: points, unit: 'points', payload: note ? { note } : {} }),
    highestBreak: async () => (await db.query<{ v: number | null }>(`SELECT MAX(value) AS v FROM log_entries WHERE type = ?`, [LOG.break]))[0]?.v ?? null,
    recentBreaks: (limit = 20) => db.query<{ id: string; ts: string; value: number }>(`SELECT id, ts, value FROM log_entries WHERE type = ? ORDER BY ts DESC LIMIT ?`, [LOG.break, limit]),
    practiceStamps: (fromTs: string) => db.query<{ ts: string; tz_offset_min: number }>(`SELECT ts, tz_offset_min FROM log_entries WHERE module = 'snooker' AND type IN (?, ?) AND ts >= ?`, [LOG.attempt, LOG.break, fromTs]),
  }
}

export type SnookerRepo = ReturnType<typeof snookerRepo>
