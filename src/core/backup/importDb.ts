import type { Row, SqlDriver, SqlValue } from '../db/driver'
import { dbEvents } from '../db/events'
import { migrate } from '../db/migrate'
import { MIGRATIONS } from '../db/migrations'
import type { Migration } from '../db/migrations/types'
import { dropAllUserTables, foreignKeyViolations, listUserTables, quoteIdent, tableColumns } from '../db/schema'
import { exportDatabase } from './exportDb'
import { ImportError, type ExportEnvelope } from './format'

export interface ImportResult {
  counts: Record<string, number>
  schemaVersionBefore: number
  schemaVersionAfter: number
}

/**
 * Replace everything with the contents of an export. Strategy:
 *  1. refuse files newer than the app;
 *  2. take an in-memory copy of the current data (the rollback);
 *  3. drop all tables, migrate to the file's schema version, insert rows, migrate to head;
 *  4. verify foreign keys; on any failure, put the copy back and rethrow.
 * Migrating to the file's version first means old exports are upgraded by the very same
 * migrations the phone would have run, so every export stays importable.
 */
export async function importDatabase(
  db: SqlDriver,
  envelope: ExportEnvelope,
  migrations: Migration[] = MIGRATIONS,
): Promise<ImportResult> {
  const head = migrations[migrations.length - 1]?.version ?? 0
  if (envelope.schemaVersion > head) throw new ImportError(`This file needs app schema ${envelope.schemaVersion}; app is at ${head}`)
  const before = await exportDatabase(db)
  try {
    await replaceDatabase(db, envelope, migrations)
  } catch (e) {
    await replaceDatabase(db, before, migrations)
    dbEvents.emit('*')
    throw e
  }
  dbEvents.emit('*')
  const counts = Object.fromEntries(Object.entries(envelope.tables).map(([t, r]) => [t, r.length]))
  return { counts, schemaVersionBefore: before.schemaVersion, schemaVersionAfter: head }
}

async function replaceDatabase(db: SqlDriver, envelope: ExportEnvelope, migrations: Migration[]): Promise<void> {
  await dropAllUserTables(db)
  await migrate(db, migrations, { toVersion: envelope.schemaVersion })
  const present = await listUserTables(db)
  await db.exec('PRAGMA foreign_keys = OFF')
  try {
    for (const [table, rows] of Object.entries(envelope.tables)) {
      if (rows.length === 0) continue
      if (!present.includes(table)) throw new ImportError(`Unknown table in file: ${table}`)
      const columns = await tableColumns(db, table)
      await db.transaction(async (tx) => {
        for (const row of rows) await insertRow(tx, table, columns, row)
      })
    }
  } finally {
    await db.exec('PRAGMA foreign_keys = ON')
  }
  await migrate(db, migrations)
  const violations = await foreignKeyViolations(db)
  if (violations > 0) throw new ImportError(`${violations} rows reference missing parents`)
}

async function insertRow(tx: SqlDriver, table: string, columns: string[], row: Row): Promise<void> {
  const keys = Object.keys(row)
  const unknown = keys.filter((k) => !columns.includes(k))
  if (unknown.length) throw new ImportError(`Unknown column ${table}.${unknown[0]} in file`)
  const cols = keys.map(quoteIdent).join(', ')
  const marks = keys.map(() => '?').join(', ')
  const values = keys.map((k) => row[k] as SqlValue)
  await tx.run(`INSERT INTO ${quoteIdent(table)} (${cols}) VALUES (${marks})`, values)
}
