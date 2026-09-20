import { m0001 } from './0001_core'
import { m0002 } from './0002_tasks'
import { m0003 } from './0003_brain'
import { m0004 } from './0004_life'
import { m0005 } from './0005_chess'
import { m0006 } from './0006_banjo_snooker'
import { m0007 } from './0007_alcohol'
import type { Migration } from './types'

/** Ordered, contiguous, append-only. Each stage appends its migrations here. */
export const MIGRATIONS: Migration[] = [m0001, m0002, m0003, m0004, m0005, m0006, m0007]

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
