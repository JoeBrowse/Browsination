import { m0001 } from './0001_core'
import type { Migration } from './types'

/** Ordered, contiguous, append-only. Each stage appends its migrations here. */
export const MIGRATIONS: Migration[] = [m0001]

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0

/** Every table any migration declares, parent before child, in version order. */
export function declaredTables(migrations: Migration[] = MIGRATIONS): string[] {
  const out: string[] = []
  for (const m of migrations) for (const t of m.tables ?? []) if (!out.includes(t)) out.push(t)
  return out
}

/** Merged fixture rows for all migrations up to `toVersion` (later fixtures win on the same table). */
export function fixturesUpTo(toVersion: number, migrations: Migration[] = MIGRATIONS) {
  const out: Record<string, ReturnType<NonNullable<Migration['fixtures']>>[string]> = {}
  for (const m of migrations) {
    if (m.version > toVersion || !m.fixtures) continue
    for (const [table, rows] of Object.entries(m.fixtures())) out[table] = [...(out[table] ?? []), ...rows]
  }
  return out
}
