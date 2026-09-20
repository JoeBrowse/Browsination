import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'
import { wrapDriver, type RawOps, type Row, type SqlDriver } from './driver'

/**
 * Android driver over @capacitor-community/sqlite.
 * The plugin is used purely as a SQLite engine: no encryption, no plugin-level
 * versioning (version is always 1; our own runner owns migrations), no plugin JSON export.
 * Every plugin call passes transaction=false; transactions are ours.
 */
export async function createNativeDriver(dbName: string): Promise<SqlDriver> {
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  const consistent = (await sqlite.checkConnectionsConsistency()).result ?? false
  const exists = (await sqlite.isConnection(dbName, false)).result ?? false
  const conn: SQLiteDBConnection =
    consistent && exists
      ? await sqlite.retrieveConnection(dbName, false)
      : await sqlite.createConnection(dbName, false, 'no-encryption', 1, false)
  await conn.open()

  const raw: RawOps = {
    async run(sql, params) {
      const r = await conn.run(sql, params, false)
      return { changes: r.changes?.changes ?? 0 }
    },
    async query(sql, params) {
      const r = await conn.query(sql, params)
      return (r.values ?? []) as Row[]
    },
    async exec(sql) {
      await conn.execute(sql, false)
    },
    async begin() {
      await conn.beginTransaction()
    },
    async commit() {
      await conn.commitTransaction()
    },
    async rollback() {
      await conn.rollbackTransaction()
    },
    async close() {
      await sqlite.closeConnection(dbName, false)
    },
  }
  return wrapDriver(raw)
}
