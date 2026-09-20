import { createSqlJsDriver, type SqlJsDriver } from '@/core/db/driver.sqljs'
import { migrate } from '@/core/db/migrate'
import { MIGRATIONS } from '@/core/db/migrations'

/** In-memory sql.js database migrated to the latest schema (or `toVersion`). ~5 ms. */
export async function makeTestDb(opts: { toVersion?: number } = {}): Promise<SqlJsDriver> {
  const db = await createSqlJsDriver()
  await db.exec('PRAGMA foreign_keys = ON')
  await migrate(db, MIGRATIONS, { toVersion: opts.toVersion })
  return db
}
