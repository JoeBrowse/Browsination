import { scalar, type SqlDriver } from './driver'
import type { Migration } from './migrations/types'

export class MigrationError extends Error {
  constructor(
    public readonly version: number,
    cause: unknown,
  ) {
    super(`Migration ${version} failed: ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'MigrationError'
  }
}

export class MigrationDriftError extends Error {
  constructor(version: number) {
    super(`Migration ${version} was edited after it was applied. Migrations are append-only.`)
    this.name = 'MigrationDriftError'
  }
}

export interface MigrateOptions {
  /** Stop after this version (used by import to replay an older export). */
  toVersion?: number
  /** Called once, before the first pending migration, when upgrading an existing database. */
  onBeforeMigrate?: (from: number, to: number) => Promise<void>
}

export interface MigrateResult {
  from: number
  to: number
  applied: number[]
}

/** FNV-1a over the migration text. Detects edits to already-applied migrations. */
export function checksumOf(m: Migration): string {
  let h = 0x811c9dc5
  const text = m.statements.join('\n')
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

const ENSURE = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL
)`

export async function currentVersion(db: SqlDriver): Promise<number> {
  await db.exec(ENSURE)
  const v = await scalar<number | null>(db, 'SELECT MAX(version) AS v FROM schema_migrations')
  return v ?? 0
}

export function assertContiguous(migrations: Migration[]): void {
  migrations.forEach((m, i) => {
    if (m.version !== i + 1) throw new Error(`Migrations must be contiguous from 1; found ${m.version} at position ${i}`)
  })
}

export async function migrate(db: SqlDriver, migrations: Migration[], opts: MigrateOptions = {}): Promise<MigrateResult> {
  assertContiguous(migrations)
  const from = await currentVersion(db)
  const applied = await db.query<{ version: number; checksum: string }>('SELECT version, checksum FROM schema_migrations')
  for (const row of applied) {
    const m = migrations[row.version - 1]
    if (m && checksumOf(m) !== row.checksum) throw new MigrationDriftError(row.version)
  }
  const target = opts.toVersion ?? (migrations[migrations.length - 1]?.version ?? 0)
  const pending = migrations.filter((m) => m.version > from && m.version <= target)
  if (pending.length === 0) return { from, to: from, applied: [] }
  if (from > 0 && opts.onBeforeMigrate) await opts.onBeforeMigrate(from, target)

  const done: number[] = []
  for (const m of pending) {
    try {
      await db.transaction(async (tx) => {
        for (const s of m.statements) await tx.exec(s)
        await tx.run('INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)', [
          m.version,
          m.name,
          checksumOf(m),
          new Date().toISOString(),
        ])
        await tx.exec(`PRAGMA user_version = ${m.version}`)
      })
    } catch (e) {
      throw new MigrationError(m.version, e)
    }
    done.push(m.version)
  }
  return { from, to: target, applied: done }
}
