/**
 * The only SQL surface the rest of the app sees. Two implementations:
 *  - driver.native.ts  (@capacitor-community/sqlite, Android)
 *  - driver.sqljs.ts   (sql.js: desktop browser dev and Vitest)
 * Repositories talk to this; UI never does.
 */
export type SqlValue = string | number | null | Uint8Array
export type Row = Record<string, SqlValue>

export interface SqlDriver {
  /** Single statement with bound parameters. */
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number }>
  /** Single SELECT with bound parameters. Rows are typed by the caller. */
  query<T = Row>(sql: string, params?: SqlValue[]): Promise<T[]>
  /** One or more statements, no parameters (DDL, pragmas). */
  exec(sql: string): Promise<void>
  /** Serialised transaction. Nesting throws. */
  transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T>
  close(): Promise<void>
}

export class NestedTransactionError extends Error {
  constructor() {
    super('Nested transactions are not supported')
    this.name = 'NestedTransactionError'
  }
}

/** Raw operations a concrete driver provides; serialisation and transactions are added by wrapDriver. */
export interface RawOps {
  run(sql: string, params: SqlValue[]): Promise<{ changes: number }>
  query(sql: string, params: SqlValue[]): Promise<Row[]>
  exec(sql: string): Promise<void>
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  close(): Promise<void>
  /** Called after any write completed outside or at the end of a transaction (persistence hook). */
  afterWrite?(): void
}

/** Simple async mutex: every public operation runs one at a time. */
export function createLock(): <T>(fn: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve()
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const next = tail.then(fn, fn)
    tail = next.catch(() => undefined)
    return next
  }
}

export function wrapDriver(raw: RawOps): SqlDriver {
  const lock = createLock()
  const txHandle: SqlDriver = {
    run: (sql, params = []) => raw.run(sql, params),
    query: <T>(sql: string, params: SqlValue[] = []) => raw.query(sql, params) as Promise<T[]>,
    exec: (sql) => raw.exec(sql),
    transaction: () => Promise.reject(new NestedTransactionError()),
    close: () => Promise.reject(new Error('Cannot close inside a transaction')),
  }
  return {
    run: (sql, params = []) =>
      lock(async () => {
        const r = await raw.run(sql, params)
        raw.afterWrite?.()
        return r
      }),
    query: <T>(sql: string, params: SqlValue[] = []) => lock(() => raw.query(sql, params) as Promise<T[]>),
    exec: (sql) =>
      lock(async () => {
        await raw.exec(sql)
        raw.afterWrite?.()
      }),
    transaction: <T>(fn: (tx: SqlDriver) => Promise<T>) =>
      lock(async () => {
        await raw.begin()
        try {
          const result = await fn(txHandle)
          await raw.commit()
          raw.afterWrite?.()
          return result
        } catch (e) {
          try {
            await raw.rollback()
          } catch {
            /* rollback failure is secondary to the original error */
          }
          throw e
        }
      }),
    close: () => lock(() => raw.close()),
  }
}

export async function queryOne<T = Row>(db: SqlDriver, sql: string, params: SqlValue[] = []): Promise<T | null> {
  const rows = await db.query<T>(sql, params)
  return rows[0] ?? null
}

export async function scalar<T extends SqlValue = SqlValue>(db: SqlDriver, sql: string, params: SqlValue[] = []): Promise<T> {
  const row = await queryOne<Row>(db, sql, params)
  if (!row) throw new Error(`No row returned for: ${sql}`)
  const first = Object.values(row)[0]
  return first as T
}
