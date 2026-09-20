import type { SqlDriver } from '@/core/db/driver'
import { SCHEMA_VERSION, declaredTables, fixturesUpTo } from '@/core/db/migrations'
import { insertRow } from '@/core/repos/base'

/** Insert every migration's fixture rows (parent tables first). */
export async function seedFixtures(db: SqlDriver, toVersion = SCHEMA_VERSION): Promise<void> {
  const fixtures = fixturesUpTo(toVersion)
  for (const table of declaredTables()) {
    for (const row of fixtures[table] ?? []) await insertRow(db, table, row)
  }
}
