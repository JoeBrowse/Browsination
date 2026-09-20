import type { Row, SqlDriver, SqlValue } from '../db/driver'
import { dbEvents } from '../db/events'
import { quoteIdent } from '../db/schema'

/** Shared insert/update/get helpers so repositories stay tiny and consistent. */
export async function insertRow(db: SqlDriver, table: string, input: object): Promise<void> {
  const row = input as Row
  const keys = Object.keys(row)
  const sql = `INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
  await db.run(
    sql,
    keys.map((k) => row[k] as SqlValue),
  )
  dbEvents.emit(table)
}

export async function updateRow(db: SqlDriver, table: string, id: string, input: object, idColumn = 'id'): Promise<boolean> {
  const patch = input as Row
  const keys = Object.keys(patch)
  if (keys.length === 0) return false
  const sql = `UPDATE ${quoteIdent(table)} SET ${keys.map((k) => `${quoteIdent(k)} = ?`).join(', ')} WHERE ${quoteIdent(idColumn)} = ?`
  const r = await db.run(sql, [...keys.map((k) => patch[k] as SqlValue), id])
  if (r.changes > 0) dbEvents.emit(table)
  return r.changes > 0
}

export async function deleteRow(db: SqlDriver, table: string, id: string, idColumn = 'id'): Promise<boolean> {
  const r = await db.run(`DELETE FROM ${quoteIdent(table)} WHERE ${quoteIdent(idColumn)} = ?`, [id])
  if (r.changes > 0) dbEvents.emit(table)
  return r.changes > 0
}

export async function getRow<T = Row>(db: SqlDriver, table: string, id: string, idColumn = 'id'): Promise<T | null> {
  const rows = await db.query<T>(`SELECT * FROM ${quoteIdent(table)} WHERE ${quoteIdent(idColumn)} = ?`, [id])
  return rows[0] ?? null
}

export function parseJson<T>(text: SqlValue | undefined, fallback: T): T {
  if (typeof text !== 'string') return fallback
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}
