import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeTestDb } from '@/test/db'
import { seedFixtures } from '@/test/fixtures'
import { SCHEMA_VERSION, declaredTables } from '../db/migrations'
import { exportDatabase, serializeEnvelope } from './exportDb'
import { memoryFileStore } from './fileStore'
import { ImportError, parseEnvelope, validateEnvelope } from './format'
import { importDatabase } from './importDb'
import { createSnapshot, listSnapshots, parseSnapshotName, readSnapshot } from './snapshots'

const strip = (e: { exportedAt: string }) => ({ ...e, exportedAt: '' })

describe('export / import round trip', () => {
  it('exports every table and imports back identically', async () => {
    const a = await makeTestDb()
    await seedFixtures(a)
    const out1 = await exportDatabase(a, '0.1.0')
    expect(Object.keys(out1.tables).sort()).toEqual([...declaredTables()].sort())
    for (const t of declaredTables()) expect(out1.tables[t]?.length, t).toBeGreaterThan(0)

    const b = await makeTestDb()
    const result = await importDatabase(b, parseEnvelope(serializeEnvelope(out1)))
    expect(result.schemaVersionAfter).toBe(SCHEMA_VERSION)
    const out2 = await exportDatabase(b, '0.1.0')
    expect(strip(out2)).toEqual(strip(out1))
  })

  it('refuses a file from a newer app and leaves data untouched', async () => {
    const db = await makeTestDb()
    await seedFixtures(db)
    const env = await exportDatabase(db)
    await expect(importDatabase(db, { ...env, schemaVersion: SCHEMA_VERSION + 1 })).rejects.toBeInstanceOf(ImportError)
    expect(strip(await exportDatabase(db))).toEqual(strip(env))
  })

  it('rolls back to the previous data when a row is invalid', async () => {
    const db = await makeTestDb()
    await seedFixtures(db)
    const before = await exportDatabase(db)
    const bad = structuredClone(before)
    bad.tables.items = [{ ...bad.tables.items![0]!, id: 'x', no_such_column: 1 }]
    await expect(importDatabase(db, bad)).rejects.toThrow(/Unknown column/)
    expect(strip(await exportDatabase(db))).toEqual(strip(before))
  })

  it('rolls back when foreign keys do not resolve', async () => {
    const db = await makeTestDb()
    await seedFixtures(db)
    const before = await exportDatabase(db)
    const bad = structuredClone(before)
    bad.tables.gift_ideas = [{ ...bad.tables.gift_ideas![0]!, person_id: 'missing' }]
    await expect(importDatabase(db, bad)).rejects.toThrow(/missing parents/)
    expect(strip(await exportDatabase(db))).toEqual(strip(before))
  })

  it('validates the envelope', () => {
    expect(() => validateEnvelope({})).toThrow(ImportError)
    expect(() => validateEnvelope({ format: 'other', formatVersion: 1, schemaVersion: 1, tables: {} })).toThrow(/Not a Browsination/)
    expect(() => parseEnvelope('nope')).toThrow(/JSON/)
  })
})

describe('snapshots', () => {
  afterEach(() => vi.useRealTimers())

  it('writes, lists, reads and prunes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-20T10:00:00.000Z'))
    const db = await makeTestDb()
    await seedFixtures(db)
    const store = memoryFileStore()
    for (let i = 0; i < 12; i++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 8, 20, 10, i)))
      await createSnapshot(db, store, i % 2 ? 'pre-migration' : 'manual')
    }
    const list = await listSnapshots(store)
    expect(list).toHaveLength(10)
    expect(list[0]!.at > list[9]!.at).toBe(true)
    const env = await readSnapshot(store, list[0]!.name)
    expect(env.schemaVersion).toBe(SCHEMA_VERSION)
    expect(env.tables.items?.length).toBeGreaterThan(0)
  })

  it('parses its own file names', () => {
    const info = parseSnapshotName('snapshot-pre-import-v3-20260920T101500123Z.json')
    expect(info).toEqual({ name: 'snapshot-pre-import-v3-20260920T101500123Z.json', reason: 'pre-import', schemaVersion: 3, at: '2026-09-20T10:15:00.123Z' })
    expect(parseSnapshotName('random.json')).toBeNull()
  })
})
