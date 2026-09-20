import type { SqlDriver } from '../db/driver'
import { newId, nowIso } from '../ids'
import { deleteRow, getRow, insertRow, updateRow } from './base'

export type ItemStatus = 'inbox' | 'todo' | 'waiting' | 'done' | 'dropped'

export interface ItemRow {
  id: string
  title: string
  notes: string
  module: string | null
  status: ItemStatus
  due_date: string | null
  due_time: string | null
  reminder_at: string | null
  recurrence: string | null
  priority: number
  entity_type: string | null
  entity_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
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
      return updateRow(db, TABLE, id, { status, completed_at, updated_at: nowIso() })
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
  }
}

export type ItemsRepo = ReturnType<typeof itemsRepo>
