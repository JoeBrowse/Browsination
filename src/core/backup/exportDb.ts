import type { SqlDriver } from '../db/driver'
import { currentVersion } from '../db/migrate'
import { declaredTables } from '../db/migrations'
import { listUserTables, quoteIdent } from '../db/schema'
import { EXPORT_FORMAT, EXPORT_FORMAT_VERSION, type ExportEnvelope } from './format'

/**
 * Schema-agnostic dump: walks sqlite_master and SELECTs every user table, so it works on
 * whatever schema the database is actually at (this matters for the pre-migration snapshot,
 * which runs before the new code's migrations). Declared tables come first in parent-child
 * order; anything else is appended alphabetically.
 */
export async function exportDatabase(db: SqlDriver, appVersion = ''): Promise<ExportEnvelope> {
  const present = await listUserTables(db)
  const ordered = [...declaredTables().filter((t) => present.includes(t)), ...present.filter((t) => !declaredTables().includes(t))]
  const tables: ExportEnvelope['tables'] = {}
  await db.transaction(async (tx) => {
    for (const t of ordered) tables[t] = await tx.query(`SELECT * FROM ${quoteIdent(t)} ORDER BY rowid`)
  })
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: await currentVersion(db),
    exportedAt: new Date().toISOString(),
    appVersion,
    tables,
  }
}

export function serializeEnvelope(e: ExportEnvelope): string {
  return JSON.stringify(e, null, 1)
}

export function exportFilename(at: Date = new Date()): string {
  const s = at.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '')
  return `browsination-export-${s}.json`
}
