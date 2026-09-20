import type { SqlDriver } from '../db/driver'
import { idb } from './idb'
import { isNative } from './platform'

export const DB_NAME = 'browsination'

/** Native SQLite on Android; sql.js persisted to IndexedDB in a desktop browser. */
export async function createAppDriver(): Promise<SqlDriver> {
  if (isNative()) {
    const { createNativeDriver } = await import('../db/driver.native')
    return createNativeDriver(DB_NAME)
  }
  const [{ createSqlJsDriver }, wasm] = await Promise.all([import('../db/driver.sqljs'), import('sql.js/dist/sql-wasm.wasm?url')])
  const driver = await createSqlJsDriver({
    locateFile: () => wasm.default,
    persistence: {
      load: () => idb.get<Uint8Array>('kv', DB_NAME).then((v) => v ?? null),
      save: (bytes) => idb.set('kv', DB_NAME, bytes).then(() => undefined),
    },
  })
  const flush = () => void driver.flush()
  document.addEventListener('visibilitychange', flush)
  window.addEventListener('pagehide', flush)
  return driver
}
