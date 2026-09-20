// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { makeTestDb } from './db'

/** Guards the assumption that component tests can use a real sql.js database under jsdom. */
describe('sql.js under jsdom', () => {
  it('opens and migrates', async () => {
    const db = await makeTestDb()
    const rows = await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM items')
    expect(rows[0]?.n).toBe(0)
  })
})
