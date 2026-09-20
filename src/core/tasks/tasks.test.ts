import { describe, expect, it } from 'vitest'
import { makeTestDb } from '@/test/db'
import { itemsRepo } from '../repos/items'
import { completeItem, uncompleteItem } from './complete'
import { taskQueries } from './queries'

describe('taskQueries', () => {
  it('splits open items into overdue, due today, focus and chase', async () => {
    const db = await makeTestDb()
    const items = itemsRepo(db)
    const tasks = taskQueries(db)
    await items.create({ title: 'late', status: 'todo', due_date: '2026-09-19' })
    await items.create({ title: 'today', status: 'todo', due_date: '2026-09-20', focus_date: '2026-09-20' })
    await items.create({ title: 'tomorrow', status: 'todo', due_date: '2026-09-21' })
    await items.create({ title: 'chase', status: 'waiting', chase_date: '2026-09-18' })
    await items.create({ title: 'inbox', status: 'inbox' })
    expect((await tasks.overdue('2026-09-20')).map((i) => i.title)).toEqual(['late'])
    expect((await tasks.dueOn('2026-09-20')).map((i) => i.title)).toEqual(['today'])
    expect((await tasks.focus('2026-09-20')).map((i) => i.title)).toEqual(['today'])
    expect((await tasks.chaseDue('2026-09-20')).map((i) => i.title)).toEqual(['chase'])
    const c = await tasks.counts('2026-09-20')
    expect(c).toMatchObject({ dueToday: 1, overdue: 1, focus: 1, dueTomorrow: 1, inbox: 1, chase: 1 })
  })

  it('counts completions within the local day', async () => {
    const db = await makeTestDb()
    const items = itemsRepo(db)
    const tasks = taskQueries(db)
    const a = await items.create({ title: 'a', status: 'todo' })
    await items.setStatus(a.id, 'done')
    const today = new Date()
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect((await tasks.counts(day)).doneToday).toBe(1)
    expect(await tasks.recentDone()).toHaveLength(1)
  })
})

describe('completeItem', () => {
  it('completes a one-off without spawning', async () => {
    const db = await makeTestDb()
    const items = itemsRepo(db)
    const a = await items.create({ title: 'a', status: 'todo', focus_date: '2026-09-20' })
    expect(await completeItem(items, a, '2026-09-20')).toBeNull()
    const done = (await items.get(a.id))!
    expect(done.status).toBe('done')
    expect(done.focus_date).toBeNull()
  })

  it('rolls a recurring item forward from its due date, skipping missed occurrences', async () => {
    const db = await makeTestDb()
    const items = itemsRepo(db)
    const a = await items.create({ title: 'bins', status: 'todo', due_date: '2026-09-14', recurrence: 'FREQ=WEEKLY', reminder_at: '2026-09-14T08:00' })
    const next = (await completeItem(items, a, '2026-09-20'))!
    expect(next.due_date).toBe('2026-09-21')
    expect(next.reminder_at).toBe('2026-09-21T08:00')
    expect(next.series_id).toBe(a.id)
    expect(next.status).toBe('todo')
    expect((await items.get(a.id))?.status).toBe('done')
  })

  it('rolls forward from the completion day when recur_from is done', async () => {
    const db = await makeTestDb()
    const items = itemsRepo(db)
    const a = await items.create({ title: 'haircut', status: 'todo', due_date: '2026-09-01', recurrence: 'FREQ=DAILY;INTERVAL=28', recur_from: 'done' })
    const next = (await completeItem(items, a, '2026-09-20'))!
    expect(next.due_date).toBe('2026-10-18')
  })

  it('undo removes the spawned occurrence and reopens the item', async () => {
    const db = await makeTestDb()
    const items = itemsRepo(db)
    const a = await items.create({ title: 'bins', status: 'todo', due_date: '2026-09-14', recurrence: 'FREQ=WEEKLY' })
    const next = await completeItem(items, a, '2026-09-20')
    await uncompleteItem(items, a, next)
    expect(await items.get(next!.id)).toBeNull()
    expect((await items.get(a.id))?.status).toBe('todo')
  })
})
