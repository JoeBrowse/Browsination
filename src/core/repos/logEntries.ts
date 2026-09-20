import type { SqlDriver } from '../db/driver'
import { newId, nowIso } from '../ids'
import { stampNow } from '../time/localDay'
import { deleteRow, getRow, insertRow, parseJson, updateRow } from './base'

/** A row of the universal log spine. `payload` is JSON text in the database. */
export interface LogEntryRow {
  id: string
  type: string
  module: string | null
  ts: string
  ts_end: string | null
  tz_offset_min: number
  value: number | null
  unit: string | null
  payload: string
  entity_type: string | null
  entity_id: string | null
  created_at: string
  updated_at: string
}

export interface LogEntry extends Omit<LogEntryRow, 'payload'> {
  payload: Record<string, unknown>
}

export interface NewLogEntry {
  type: string
  module?: string | null
  ts?: string
  ts_end?: string | null
  tz_offset_min?: number
  value?: number | null
  unit?: string | null
  payload?: Record<string, unknown>
  entity_type?: string | null
  entity_id?: string | null
}

const TABLE = 'log_entries'

export function toEntry(row: LogEntryRow): LogEntry {
  return { ...row, payload: parseJson<Record<string, unknown>>(row.payload, {}) }
}

export function logEntriesRepo(db: SqlDriver) {
  return {
    async add(input: NewLogEntry): Promise<LogEntry> {
      const stamp = stampNow()
      const t = nowIso()
      const row: LogEntryRow = {
        id: newId(),
        type: input.type,
        module: input.module ?? null,
        ts: input.ts ?? stamp.ts,
        ts_end: input.ts_end ?? null,
        tz_offset_min: input.tz_offset_min ?? stamp.tz_offset_min,
        value: input.value ?? null,
        unit: input.unit ?? null,
        payload: JSON.stringify(input.payload ?? {}),
        entity_type: input.entity_type ?? null,
        entity_id: input.entity_id ?? null,
        created_at: t,
        updated_at: t,
      }
      await insertRow(db, TABLE, row)
      return toEntry(row)
    },
    async get(id: string): Promise<LogEntry | null> {
      const row = await getRow<LogEntryRow>(db, TABLE, id)
      return row ? toEntry(row) : null
    },
    async update(id: string, patch: Partial<Omit<LogEntry, 'id' | 'created_at'>>): Promise<boolean> {
      const { payload, ...rest } = patch
      const dbPatch: Record<string, string | number | null> = { ...rest, updated_at: nowIso() } as Record<string, string | number | null>
      if (payload) dbPatch.payload = JSON.stringify(payload)
      return updateRow(db, TABLE, id, dbPatch)
    },
    remove: (id: string) => deleteRow(db, TABLE, id),
    async listByType(type: string, fromTs: string, toTs: string): Promise<LogEntry[]> {
      const rows = await db.query<LogEntryRow>('SELECT * FROM log_entries WHERE type = ? AND ts >= ? AND ts < ? ORDER BY ts', [type, fromTs, toTs])
      return rows.map(toEntry)
    },
    async listBetween(fromTs: string, toTs: string): Promise<LogEntry[]> {
      const rows = await db.query<LogEntryRow>('SELECT * FROM log_entries WHERE ts >= ? AND ts < ? ORDER BY ts', [fromTs, toTs])
      return rows.map(toEntry)
    },
    async lastOfType(type: string): Promise<LogEntry | null> {
      const rows = await db.query<LogEntryRow>('SELECT * FROM log_entries WHERE type = ? ORDER BY ts DESC LIMIT 1', [type])
      return rows[0] ? toEntry(rows[0]) : null
    },
    /** Timestamps and offsets of every entry of a type since `fromTs`; the caller buckets them into days. */
    stampsOfType(type: string, fromTs: string): Promise<{ ts: string; tz_offset_min: number }[]> {
      return db.query<{ ts: string; tz_offset_min: number }>('SELECT ts, tz_offset_min FROM log_entries WHERE type = ? AND ts >= ?', [type, fromTs])
    },
  }
}

export type LogEntriesRepo = ReturnType<typeof logEntriesRepo>
