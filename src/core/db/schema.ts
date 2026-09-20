import { scalar, type SqlDriver } from './driver'

export const META_TABLES = new Set(['schema_migrations'])

/** User tables present in the database, alphabetical. Excludes sqlite internals and migration metadata. */
export async function listUserTables(db: SqlDriver): Promise<string[]> {
  const rows = await db.query<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  )
  return rows.map((r) => r.name).filter((n) => !META_TABLES.has(n))
}

export async function tableColumns(db: SqlDriver, table: string): Promise<string[]> {
  const rows = await db.query<{ name: string }>(`PRAGMA table_info(${quoteIdent(table)})`)
  return rows.map((r) => r.name)
}

export async function userVersion(db: SqlDriver): Promise<number> {
  return scalar<number>(db, 'PRAGMA user_version')
}

export async function foreignKeyViolations(db: SqlDriver): Promise<number> {
  const rows = await db.query('PRAGMA foreign_key_check')
  return rows.length
}

export async function dropAllUserTables(db: SqlDriver): Promise<void> {
  const tables = await listUserTables(db)
  await db.exec('PRAGMA foreign_keys = OFF')
  await db.transaction(async (tx) => {
    for (const t of tables) await tx.exec(`DROP TABLE IF EXISTS ${quoteIdent(t)}`)
    await tx.exec('DROP TABLE IF EXISTS schema_migrations')
    await tx.exec('PRAGMA user_version = 0')
  })
  await db.exec('PRAGMA foreign_keys = ON')
}

export function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Invalid identifier: ${name}`)
  return `"${name}"`
}
