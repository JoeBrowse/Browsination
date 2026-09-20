import { afterEach, describe, expect, it, vi } from 'vitest'
import { DIGEST_KEYS, nextDaily, planNotifications, wallClockToDate, type PlannerInput } from './planner'
import { reconcile } from './reconcile'
import { notificationId } from './types'

const base = (now: Date, over: Partial<PlannerInput> = {}): PlannerInput => ({
  now,
  settings: {
    'notifications.enabled': true,
    'notifications.morningDigest': { enabled: true, time: '08:00' },
    'notifications.eveningDigest': { enabled: true, time: '20:30' },
    'notifications.timed': true,
  },
  items: [],
  counts: { dueToday: 2, overdue: 1, focus: 3, doneToday: 0, dueTomorrow: 4 },
  ...over,
})

describe('planner', () => {
  afterEach(() => vi.useRealTimers())

  it('produces nothing when notifications are off', () => {
    const input = base(new Date('2026-09-20T10:00:00'))
    input.settings['notifications.enabled'] = false
    expect(planNotifications(input)).toEqual([])
  })

  it('schedules the next digest occurrences with fresh bodies', () => {
    const now = new Date(2026, 8, 20, 10, 0) // 10:00 local
    const out = planNotifications(base(now))
    const morning = out.find((n) => n.key === DIGEST_KEYS.morning)!
    const evening = out.find((n) => n.key === DIGEST_KEYS.evening)!
    expect(new Date(morning.at).getDate()).toBe(21) // tomorrow, 08:00 already passed
    expect(new Date(evening.at).getDate()).toBe(20)
    expect(morning.body).toBe('3 focus · 2 due today · 1 overdue')
    expect(evening.body).toBe('4 due tomorrow')
  })

  it('schedules timed reminders inside the window for open items only', () => {
    const now = new Date(2026, 8, 20, 10, 0)
    const out = planNotifications(
      base(now, {
        settings: { ...base(now).settings, 'notifications.morningDigest': { enabled: false, time: '08:00' }, 'notifications.eveningDigest': { enabled: false, time: '20:30' } },
        items: [
          { id: 'a', title: 'Soon', status: 'todo', reminder_at: '2026-09-20T18:00', due_date: '2026-09-20' },
          { id: 'b', title: 'Past', status: 'todo', reminder_at: '2026-09-20T09:00', due_date: null },
          { id: 'c', title: 'Done', status: 'done', reminder_at: '2026-09-21T09:00', due_date: null },
          { id: 'd', title: 'Far', status: 'todo', reminder_at: '2026-12-01T09:00', due_date: null },
          { id: 'e', title: 'No time', status: 'todo', reminder_at: null, due_date: null },
        ],
      }),
    )
    expect(out.map((n) => n.title)).toEqual(['Soon'])
    expect(out[0]!.body).toBe('Due 2026-09-20')
    expect(out[0]!.id).toBe(notificationId('item:a'))
  })

  it('honours the timed toggle', () => {
    const now = new Date(2026, 8, 20, 10, 0)
    const input = base(now, { items: [{ id: 'a', title: 'Soon', status: 'todo', reminder_at: '2026-09-20T18:00', due_date: null }] })
    input.settings['notifications.timed'] = false
    expect(planNotifications(input).filter((n) => n.channel === 'timed')).toHaveLength(0)
  })

  it('handles wall clock times across the UK clock change', () => {
    // 25 Oct 2026 01:30 local exists twice in Europe/London; the Date constructor picks one and we accept it.
    expect(wallClockToDate('2026-10-25T09:00')?.getHours()).toBe(9)
    expect(wallClockToDate('bad')).toBeNull()
    const now = new Date(2026, 2, 28, 23, 0) // eve of BST start
    expect(nextDaily('08:00', now).getHours()).toBe(8)
  })
})

describe('reconcile', () => {
  it('cancels stale, keeps unchanged, reschedules changed', () => {
    const d = (key: string, at: string, body = 'b') => ({ id: notificationId(key), key, at, title: 't', body, channel: 'timed' as const, route: '/' })
    const desired = [d('a', '2026-09-21T08:00:00.000Z'), d('b', '2026-09-21T09:00:00.000Z', 'new'), d('c', '2026-09-21T10:00:00.000Z')]
    const pending = [
      { id: notificationId('a'), at: '2026-09-21T08:00:30.000Z', title: 't', body: 'b' },
      { id: notificationId('b'), at: '2026-09-21T09:00:00.000Z', title: 't', body: 'old' },
      { id: notificationId('z'), at: '2026-09-21T11:00:00.000Z', title: 't', body: 'b' },
    ]
    const plan = reconcile(desired, pending)
    expect(plan.cancel).toEqual([notificationId('z')])
    expect(plan.schedule.map((n) => n.key)).toEqual(['b', 'c'])
  })
})

describe('notificationId', () => {
  it('is stable, positive and 31-bit', () => {
    const id = notificationId('item:abc')
    expect(id).toBe(notificationId('item:abc'))
    expect(id).toBeGreaterThan(0)
    expect(id).toBeLessThanOrEqual(0x7fffffff)
    expect(notificationId('x')).not.toBe(notificationId('y'))
  })
})
