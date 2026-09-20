import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'
import { wrapDriver, type RawOps, type Row, type SqlDriver, type SqlValue } from './driver'

/** Where the database image is kept between runs (IndexedDB in the browser; nothing in tests). */
export interface SqlJsPersistence {
  load(): Promise<Uint8Array | null>
  save(bytes: Uint8Array): Promise<void>
}

export interface SqlJsDriverOptions {
  locateFile?: (file: string) => string
  persistence?: SqlJsPersistence
  saveDebounceMs?: number
}

export interface SqlJsDriver extends SqlDriver {
  /** Snapshot of the whole database image. */
  exportBytes(): Uint8Array
  /** Write any pending changes to persistence now. */
  flush(): Promise<void>
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null
function loadSqlJs(locateFile?: (f: string) => string): Promise<SqlJsStatic> {
  if (!sqlJsPromise) sqlJsPromise = initSqlJs(locateFile ? { locateFile } : {})
  return sqlJsPromise
}

export async function createSqlJsDriver(opts: SqlJsDriverOptions = {}): Promise<SqlJsDriver> {
  const SQL = await loadSqlJs(opts.locateFile)
  const existing = opts.persistence ? await opts.persistence.load() : null
  const db: Database = existing ? new SQL.Database(existing) : new SQL.Database()

  let timer: ReturnType<typeof setTimeout> | null = null
  let dirty = false
  const flush = async () => {
    if (timer) clearTimeout(timer)
    timer = null
    if (!dirty || !opts.persistence) return
    dirty = false
    await opts.persistence.save(db.export())
  }
  const markDirty = () => {
    if (!opts.persistence) return
    dirty = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void flush(), opts.saveDebounceMs ?? 300)
  }

  const raw: RawOps = {
    async run(sql, params) {
      db.run(sql, params as (string | number | null | Uint8Array)[])
      return { changes: db.getRowsModified() }
    },
    async query(sql, params) {
      const stmt = db.prepare(sql)
      try {
        stmt.bind(params as (string | number | null | Uint8Array)[])
        const rows: Row[] = []
        while (stmt.step()) rows.push(stmt.getAsObject() as Row)
        return rows
      } finally {
        stmt.free()
      }
    },
    async exec(sql) {
      db.exec(sql)
    },
    async begin() {
      db.exec('BEGIN')
    },
    async commit() {
      db.exec('COMMIT')
    },
    async rollback() {
      db.exec('ROLLBACK')
    },
    async close() {
      await flush()
      db.close()
    },
    afterWrite: markDirty,
  }

  const driver = wrapDriver(raw)
  return Object.assign(driver, {
    exportBytes: () => db.export(),
    flush,
  })
}

export type { SqlValue }
