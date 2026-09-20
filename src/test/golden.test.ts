import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exportDatabase, serializeEnvelope } from '@/core/backup/exportDb'
import { parseEnvelope } from '@/core/backup/format'
import { importDatabase } from '@/core/backup/importDb'
import { SCHEMA_VERSION } from '@/core/db/migrations'
import { makeTestDb } from './db'
import { seedFixtures } from './fixtures'

/**
 * One export file per schema version is committed under src/test/golden. Every one of them must
 * import into the current schema, which is what guarantees old backups stay restorable.
 * Generate the file for a new schema version with:  WRITE_GOLDEN=1 npx vitest run src/test/golden
 */
const DIR = join(import.meta.dirname, 'golden')

describe('golden exports', () => {
  it(`has a golden export for schema v${SCHEMA_VERSION}`, async () => {
    const file = join(DIR, `export-v${SCHEMA_VERSION}.json`)
    if (process.env.WRITE_GOLDEN) {
      const db = await makeTestDb()
      await seedFixtures(db)
      const env = await exportDatabase(db, 'golden')
      env.exportedAt = '2026-01-01T00:00:00.000Z'
      mkdirSync(DIR, { recursive: true })
      writeFileSync(file, serializeEnvelope(env))
    }
    expect(existsSync(file), `missing ${file}; run WRITE_GOLDEN=1 npx vitest run src/test/golden`).toBe(true)
  })

  it('imports every golden export into the current schema', async () => {
    const files = readdirSync(DIR).filter((f) => /^export-v\d+\.json$/.test(f))
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) {
      const env = parseEnvelope(readFileSync(join(DIR, f), 'utf8'))
      const db = await makeTestDb()
      const result = await importDatabase(db, env)
      expect(result.schemaVersionAfter, f).toBe(SCHEMA_VERSION)
      const after = await exportDatabase(db)
      for (const [table, rows] of Object.entries(env.tables)) expect(after.tables[table]?.length, `${f} ${table}`).toBe(rows.length)
    }
  })
})
