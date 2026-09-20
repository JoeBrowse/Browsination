import { dbEvents } from '../db/events'
import type { SqlDriver } from '../db/driver'
import type { PermissionState } from '../platform/notifications'
import type { SettingsRepo } from '../repos/settings'
import { taskQueries } from '../tasks/queries'
import { calendarDay } from '../time/localDay'
import { planNotifications } from './planner'
import { reconcile } from './reconcile'
import type { NotificationPort } from './types'

export interface NotificationDeps {
  db: SqlDriver
  settings: SettingsRepo
  port: NotificationPort
  permission: () => Promise<PermissionState>
  now?: () => Date
}

export interface SyncResult {
  scheduled: number
  cancelled: number
  skipped?: 'disabled' | 'permission'
}

/** Recomputes the desired notification set and applies the diff. Safe to call often. */
export async function syncNotifications(deps: NotificationDeps): Promise<SyncResult> {
  const settings = await deps.settings.all()
  const pending = await deps.port.getPending()
  if (!settings['notifications.enabled']) {
    if (pending.length) await deps.port.cancel(pending.map((p) => p.id))
    return { scheduled: 0, cancelled: pending.length, skipped: 'disabled' }
  }
  if ((await deps.permission()) !== 'granted') return { scheduled: 0, cancelled: 0, skipped: 'permission' }
  const now = deps.now ? deps.now() : new Date()
  const tasks = taskQueries(deps.db)
  const items = await tasks.withReminders()
  const counts = await tasks.counts(calendarDay(now))
  const desired = planNotifications({ now, settings, items, counts })
  const plan = reconcile(desired, pending)
  if (plan.cancel.length) await deps.port.cancel(plan.cancel)
  if (plan.schedule.length) await deps.port.schedule(plan.schedule)
  return { scheduled: plan.schedule.length, cancelled: plan.cancel.length }
}

/**
 * Keeps the OS in step with the database: on start, on app foreground/background,
 * and (debounced) after any change to items or settings.
 */
export function installNotificationSync(
  deps: NotificationDeps,
  hooks: { onForeground: (cb: () => void) => () => void; onBackground: (cb: () => void) => () => void },
  debounceMs = 1500,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const run = () => void syncNotifications(deps).catch(() => undefined)
  const later = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, debounceMs)
  }
  run()
  const offs = [
    hooks.onForeground(run),
    hooks.onBackground(run),
    dbEvents.subscribe((tables) => dbEvents.affects(tables, ['items', 'settings']) && later()),
  ]
  return () => {
    if (timer) clearTimeout(timer)
    offs.forEach((off) => off())
  }
}
