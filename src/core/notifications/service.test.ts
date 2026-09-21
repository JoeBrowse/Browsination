import { describe, expect, it } from 'vitest'
import { makeTestDb } from '@/test/db'
import { itemsRepo } from '../repos/items'
import { settingsRepo } from '../repos/settings'
import { syncNotifications } from './service'
import type { NotificationPort, PendingNotification } from './types'

function fakePort() {
  const pending = new Map<number, PendingNotification>()
  const port: NotificationPort = {
    async getPending() {
      return [...pending.values()]
    },
    async schedule(list) {
      for (const n of list) pending.set(n.id, { id: n.id, at: n.at, title: n.title, body: n.body })
    },
    async cancel(ids) {
      for (const id of ids) pending.delete(id)
    },
  }
  return { port, pending }
}

describe('syncNotifications', () => {
  it('schedules digests and reminders when enabled and permitted, and clears when disabled', async () => {
    const db = await makeTestDb()
    const settings = settingsRepo(db)
    const items = itemsRepo(db)
    const { port, pending } = fakePort()
    const now = () => new Date(2026, 8, 20, 10, 0)
    await items.create({ title: 'call', status: 'todo', reminder_at: '2026-09-20T15:00' })

    const off = await syncNotifications({ db, settings, port, permission: async () => 'granted', now })
    expect(off.skipped).toBe('disabled')
    expect(pending.size).toBe(0)

    await settings.set('notifications.enabled', true)
    const on = await syncNotifications({ db, settings, port, permission: async () => 'granted', now })
    // digests, the item reminder and the weekly review reminder (Stage 9, on by default)
    expect(on.scheduled).toBe(4)
    expect([...pending.values()].map((p) => p.title).sort()).toEqual(['Evening', 'Today', 'Weekly review', 'call'])

    const again = await syncNotifications({ db, settings, port, permission: async () => 'granted', now })
    expect(again.scheduled).toBe(0)
    expect(again.cancelled).toBe(0)

    await settings.set('notifications.enabled', false)
    const cleared = await syncNotifications({ db, settings, port, permission: async () => 'granted', now })
    expect(cleared.cancelled).toBe(4)
    expect(pending.size).toBe(0)
  })

  it('does nothing without permission', async () => {
    const db = await makeTestDb()
    const settings = settingsRepo(db)
    await settings.set('notifications.enabled', true)
    const { port, pending } = fakePort()
    const r = await syncNotifications({ db, settings, port, permission: async () => 'denied' })
    expect(r.skipped).toBe('permission')
    expect(pending.size).toBe(0)
  })
})
