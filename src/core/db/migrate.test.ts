import { describe, expect, it, vi } from 'vitest'
import { createSqlJsDriver } from './driver.sqljs'
import { MigrationDriftError, MigrationError, currentVersion, migrate } from './migrate'
import { MIGRATIONS, SCHEMA_VERSION, declaredTables, fixturesUpTo } from './migrations'
import type { Migration } from './migrations/types'
import { listUserTables, userVersion } from './schema'
import { makeTestDb } from '@/test/db'

describe('migration runner', () => {
  it('migrates a fresh database to the latest version', async () => {
    const db = await makeTestDb()
    expect(await currentVersion(db)).toBe(SCHEMA_VERSION)
    expect(await userVersion(db)).toBe(SCHEMA_VERSION)
    const tables = await listUserTables(db)
    expect(tables.sort()).toEqual([...declaredTables()].sort())
  })

  it('is idempotent', async () => {
    const db = await makeTestDb()
    const r = await migrate(db, MIGRATIONS)
    expect(r.applied).toEqual([])
    expect(r.from).toBe(SCHEMA_VERSION)
  })

  it('stops at toVersion', async () => {
    const db = await makeTestDb({ toVersion: 1 })
    expect(await currentVersion(db)).toBe(1)
  })

  it('rolls back a failing migration and leaves the previous version intact', async () => {
    const db = await createSqlJsDriver()
    const broken: Migration = { version: 2, name: 'broken', statements: ['CREATE TABLE probe (a TEXT)', 'THIS IS NOT SQL'] }
    const list = [MIGRATIONS[0]!, broken]
    await expect(migrate(db, list)).rejects.toBeInstanceOf(MigrationError)
    expect(await currentVersion(db)).toBe(1)
    expect(await listUserTables(db)).not.toContain('probe')
  })

  it('detects an edited migration', async () => {
    const db = await makeTestDb({ toVersion: 1 })
    const edited: Migration = { ...MIGRATIONS[0]!, statements: [...MIGRATIONS[0]!.statements, 'CREATE TABLE extra (a TEXT)'] }
    await expect(migrate(db, [edited])).rejects.toBeInstanceOf(MigrationDriftError)
  })

  it('calls the snapshot hook once when upgrading an existing database, never on a fresh one', async () => {
    const hook = vi.fn(async () => {})
    const fresh = await createSqlJsDriver()
    await migrate(fresh, MIGRATIONS, { onBeforeMigrate: hook })
    expect(hook).not.toHaveBeenCalled()

    const existing = await makeTestDb({ toVersion: 1 })
    const next: Migration = { version: SCHEMA_VERSION + 1, name: 'probe', statements: ['CREATE TABLE probe (a TEXT)'] }
    await migrate(existing, [...MIGRATIONS, next], { onBeforeMigrate: hook })
    expect(hook).toHaveBeenCalledTimes(1)
    expect(hook).toHaveBeenCalledWith(1, SCHEMA_VERSION + 1)
  })

  it('rejects non-contiguous migration lists', async () => {
    const db = await createSqlJsDriver()
    const gap: Migration = { version: 3, name: 'gap', statements: [] }
    await expect(migrate(db, [MIGRATIONS[0]!, gap])).rejects.toThrow(/contiguous/)
  })

  it('declares every table it creates and ships a fixture row for each', () => {
    for (const table of declaredTables()) {
      const rows = fixturesUpTo(SCHEMA_VERSION)[table]
      expect(rows?.length ?? 0, `fixture rows for ${table}`).toBeGreaterThan(0)
    }
  })
})
