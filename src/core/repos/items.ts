import type { SqlDriver } from '../db/driver'
import { newId, nowIso } from '../ids'
import { deleteRow, getRow, insertRow, updateRow } from './base'

export type ItemStatus = 'inbox' | 'todo' | 'waiting' | 'done' | 'dropped'
export type RecurFrom = 'due' | 'done'

export interface ItemRow {
  id: string
  title: string
  notes: string
  module: string | null
  status: ItemStatus
  /** Civil date 'YYYY-MM-DD'. */
  due_date: string | null
  /** Civil time 'HH:MM'. */
  due_time: string | null
  /** Local wall clock 'YYYY-MM-DDTHH:MM'. */
  reminder_at: string | null
  /** RRULE subset, see src/core/recurrence. */
  recurrence: string | null
  priority: number
  entity_type: string | null
  entity_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  waiting_person_id: string | null
  chase_date: string | null
  focus_date: string | null
  series_id: string | null
  recur_from: RecurFrom
}

export type NewItem = Partial<Omit<ItemRow, 'id' | 'created_at' | 'updated_at'>> & { title: string }
export type ItemPatch = Partial<Omit<ItemRow, 'id' | 'created_at'>>

const TABLE = 'items'

export function itemsRepo(db: SqlDriver) {
  return {
    async create(input: NewItem): Promise<ItemRow> {
      const t = nowIso()
      const row: ItemRow = {
        id: newId(),
        title: input.title.trim(),
        notes: input.notes ?? '',
        module: input.module ?? null,
        status: input.status ?? 'inbox',
        due_date: input.due_date ?? null,
        due_time: input.due_time ?? null,
        reminder_at: input.reminder_at ?? null,
        recurrence: input.recurrence ?? null,
        priority: input.priority ?? 0,
        entity_type: input.entity_type ?? null,
        entity_id: input.entity_id ?? null,
        created_at: t,
        updated_at: t,
        completed_at: input.completed_at ?? null,
        waiting_person_id: input.waiting_person_id ?? null,
        chase_date: input.chase_date ?? null,
        focus_date: input.focus_date ?? null,
        series_id: input.series_id ?? null,
        recur_from: input.recur_from ?? 'due',
      }
      await insertRow(db, TABLE, row)
      return row
    },
    get: (id: string) => getRow<ItemRow>(db, TABLE, id),
    async update(id: string, patch: ItemPatch): Promise<boolean> {
      return updateRow(db, TABLE, id, { ...patch, updated_at: nowIso() })
    },
    async setStatus(id: string, status: ItemStatus): Promise<boolean> {
      const completed_at = status === 'done' ? nowIso() : null
      const extra = status === 'done' || status === 'dropped' ? { focus_date: null } : {}
      return updateRow(db, TABLE, id, { status, completed_at, ...extra, updated_at: nowIso() })
    },
    remove: (id: string) => deleteRow(db, TABLE, id),
    listByStatus(status: ItemStatus, limit = 500): Promise<ItemRow[]> {
      return db.query<ItemRow>(
        `SELECT * FROM items WHERE status = ? ORDER BY due_date IS NULL, due_date, priority DESC, created_at LIMIT ?`,
        [status, limit],
      )
    },
    count(status: ItemStatus): Promise<number> {
      return db.query<{ n: number }>('SELECT COUNT(*) AS n FROM items WHERE status = ?', [status]).then((r) => r[0]?.n ?? 0)
    },
    listForEntity(entity_type: string, entity_id: string): Promise<ItemRow[]> {
      return db.query<ItemRow>('SELECT * FROM items WHERE entity_type = ? AND entity_id = ? ORDER BY status, due_date', [entity_type, entity_id])
    },
  }
}

export type ItemsRepo = ReturnType<typeof itemsRepo>
