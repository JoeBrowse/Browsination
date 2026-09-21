import { describe, expect, it } from 'vitest'
import { MIGRATIONS, declaredTables } from '@/core/db/migrations'
import { tableColumns } from '@/core/db/schema'
import { makeTestDb } from '@/test/db'

/** The money module stores no bank logins, card numbers, sort codes or account numbers, by construction. */
const FORBIDDEN = [/number/i, /sort_code/i, /login/i, /password/i, /iban/i, /pan\b/i, /cvv/i, /expiry_?month/i]

describe('money schema', () => {
  it('has no column that could hold a bank login, card number or account number', async () => {
    const db = await makeTestDb()
    for (const table of declaredTables(MIGRATIONS)) {
      for (const col of await tableColumns(db, table)) {
        for (const re of FORBIDDEN) expect(`${table}.${col}`).not.toMatch(re)
      }
    }
  })
  it('keeps trips and gift ideas pointing at goals without a hard constraint', async () => {
    const db = await makeTestDb()
    const cols = await tableColumns(db, 'trips')
    expect(cols).toContain('goal_id')
    expect(await tableColumns(db, 'gift_ideas')).toEqual(expect.arrayContaining(['budget_pence', 'goal_id']))
  })
})
