import { describe, expect, it } from 'vitest'
import { findLogType, getModules, moduleLogTypes } from '@/core/modules/registry'
import { logEntriesRepo } from '@/core/repos/logEntries'
import { seedFixtures } from '@/test/fixtures'
import { makeTestDb } from '@/test/db'
import { describeEntry, valueLabel } from './types'

/** Every type the app writes anywhere. A new one without a descriptor cannot be edited, so it fails here. */
const WRITTEN = ['mood', 'sleep', 'meditation', 'stretch', 'habit', 'contact', 'date_night', 'admin_done', 'match_result', 'practice', 'learn', 'review', 'routine_attempt', 'break', 'drink', 'caffeine', 'medication', 'morning_after', 'money_checkin', 'focus']

describe('log type registry', () => {
  it('describes every type the app writes', () => {
    for (const type of WRITTEN) expect(findLogType(type)?.label, type).toBeTruthy()
  })
  it('claims each type once per module, under a real module', () => {
    const ids = new Set<string>([...getModules().map((m) => m.id), 'core'])
    const seen = new Set<string>()
    for (const d of moduleLogTypes()) {
      expect(ids.has(d.module), d.module).toBe(true)
      const key = `${d.module}:${d.type}`
      expect(seen.has(key), key).toBe(false)
      seen.add(key)
      expect(d.label.split(' ').length).toBeLessThanOrEqual(2)
    }
  })
  it('covers every type in the fixtures', async () => {
    const db = await makeTestDb()
    await seedFixtures(db)
    const types = await db.query<{ type: string }>('SELECT DISTINCT type FROM log_entries')
    expect(types.length).toBeGreaterThan(0)
    for (const { type } of types) expect(findLogType(type)?.label, type).toBeTruthy()
  })
})

describe('describing an entry', () => {
  it('reads the number and whatever text the payload carries', async () => {
    const db = await makeTestDb()
    const logs = logEntriesRepo(db)
    const e = await logs.add({ type: 'break', module: 'snooker', value: 47, unit: 'points', payload: { note: 'long pot' } })
    expect(describeEntry(findLogType('break'), e)).toBe('47 points · long pot')
  })
  it('leaves the editor-only numbers out of the line', async () => {
    const db = await makeTestDb()
    const logs = logEntriesRepo(db)
    const e = await logs.add({ type: 'drink', module: 'alcohol', value: 11.72, unit: 'g', payload: { name: 'Bottle', units: 1.49, volume_ml: 330, abv: 4.5 } })
    expect(describeEntry(findLogType('drink'), e)).toBe('11.7 g · Bottle')
  })
  it('keeps one decimal for a fraction and says nothing without a value', () => {
    const def = findLogType('drink')
    expect(valueLabel(def, { value: 17.64, unit: 'g' })).toBe('17.6 g')
    expect(valueLabel(def, { value: null, unit: 'g' })).toBe('')
  })
})
