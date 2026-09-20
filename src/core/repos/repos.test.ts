import { describe, expect, it, vi } from 'vitest'
import { makeTestDb } from '@/test/db'
import { dbEvents } from '../db/events'
import { filesRepo } from './files'
import { itemsRepo } from './items'
import { logEntriesRepo } from './logEntries'
import { peopleRepo } from './people'
import { settingsRepo } from './settings'

describe('itemsRepo', () => {
  it('creates inbox items and moves them through statuses', async () => {
    const db = await makeTestDb()
    const items = itemsRepo(db)
    const a = await items.create({ title: '  Buy milk ' })
    expect(a.title).toBe('Buy milk')
    expect(a.status).toBe('inbox')
    expect(await items.count('inbox')).toBe(1)
    await items.setStatus(a.id, 'done')
    const done = await items.get(a.id)
    expect(done?.status).toBe('done')
    expect(done?.completed_at).not.toBeNull()
    await items.setStatus(a.id, 'todo')
    expect((await items.get(a.id))?.completed_at).toBeNull()
  })

  it('orders by due date with undated items last', async () => {
    const db = await makeTestDb()
    const items = itemsRepo(db)
    await items.create({ title: 'no date', status: 'todo' })
    await items.create({ title: 'later', status: 'todo', due_date: '2026-10-01' })
    await items.create({ title: 'soon', status: 'todo', due_date: '2026-09-21' })
    expect((await items.listByStatus('todo')).map((i) => i.title)).toEqual(['soon', 'later', 'no date'])
  })

  it('emits a table event on write', async () => {
    const db = await makeTestDb()
    const seen = vi.fn()
    const off = dbEvents.subscribe(seen)
    await itemsRepo(db).create({ title: 'x' })
    off()
    expect(seen).toHaveBeenCalledWith(['items'])
  })
})

describe('logEntriesRepo', () => {
  it('stamps time and offset, stores payload as JSON, and finds the last of a type', async () => {
    const db = await makeTestDb()
    const log = logEntriesRepo(db)
    const e = await log.add({ type: 'mood', module: 'brain', value: 4, unit: 'score', payload: { note: 'ok' } })
    expect(e.ts).toMatch(/Z$/)
    expect(typeof e.tz_offset_min).toBe('number')
    expect((await log.lastOfType('mood'))?.payload).toEqual({ note: 'ok' })
    const rows = await log.listByType('mood', '2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z')
    expect(rows).toHaveLength(1)
    await log.update(e.id, { value: 5, payload: { note: 'better' } })
    expect((await log.get(e.id))?.value).toBe(5)
    expect((await log.get(e.id))?.payload).toEqual({ note: 'better' })
  })
})

describe('peopleRepo', () => {
  it('cascades gift ideas when a person is removed', async () => {
    const db = await makeTestDb()
    const people = peopleRepo(db)
    const p = await people.create({ name: 'Sophie', birthday: '--05-14' })
    await people.addGiftIdea(p.id, 'Monstera')
    expect(await people.giftIdeas(p.id)).toHaveLength(1)
    await people.remove(p.id)
    expect(await people.giftIdeas(p.id)).toHaveLength(0)
  })
})

describe('filesRepo', () => {
  it('stores metadata by entity', async () => {
    const db = await makeTestDb()
    const files = filesRepo(db)
    await files.create({ module: 'banjo', entity_type: 'banjo.piece', entity_id: 'x', rel_path: 'files/a.pdf', mime: 'application/pdf', title: 'A' })
    expect(await files.forEntity('banjo.piece', 'x')).toHaveLength(1)
  })
})

describe('settingsRepo', () => {
  it('returns defaults, stores typed values, and lists all', async () => {
    const db = await makeTestDb()
    const s = settingsRepo(db)
    expect(await s.get('dayStartHour')).toBe(4)
    await s.set('dayStartHour', 5)
    await s.set('notifications.morningDigest', { enabled: false, time: '07:30' })
    expect(await s.get('dayStartHour')).toBe(5)
    const all = await s.all()
    expect(all.dayStartHour).toBe(5)
    expect(all['notifications.morningDigest']).toEqual({ enabled: false, time: '07:30' })
    expect(all.theme).toBe('dark')
  })
})
