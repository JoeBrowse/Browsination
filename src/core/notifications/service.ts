import { dbEvents } from '../db/events'
import type { SqlDriver } from '../db/driver'
import { endsAt, FOCUS_NOTIFICATION_KEY, useFocus } from '../focus/focusStore'
import type { ModuleDef } from '../modules/types'
import { nextReviewAt, reviewWeekFor } from '../review/logic'
import { reviewRepo } from '../review/repo'
import type { PermissionState } from '../platform/notifications'
import type { SettingsRepo } from '../repos/settings'
import { taskQueries } from '../tasks/queries'
import { calendarDay, todayLocal } from '../time/localDay'
import { planNotifications } from './planner'
import { reconcile } from './reconcile'
import type { NotificationPort } from './types'

export interface NotificationDeps {
  db: SqlDriver
  settings: SettingsRepo
  port: NotificationPort
  permission: () => Promise<PermissionState>
  /** Modules whose `digest` hooks contribute lines to the morning digest. */
  modules?: ModuleDef[]
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
  const calendarToday = calendarDay(now)
  const counts = await tasks.counts(calendarToday)
  const ctx = { db: deps.db, today: todayLocal(now, settings.dayStartHour), calendarToday, now }
  const extraLines: string[] = []
  const extraTimed: NonNullable<Parameters<typeof planNotifications>[0]['extraTimed']> = []
  for (const m of deps.modules ?? []) {
    try {
      if (m.digest) extraLines.push(...(await m.digest(ctx)))
      if (m.reminders) extraTimed.push(...(await m.reminders(ctx)))
    } catch {
      /* a broken module never blocks the digest */
    }
  }
  // Core reminders: the weekly review (unless this week's is done) and the end of a running focus session.
  if (settings['review.reminder']) {
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const at = nextReviewAt(calendarToday, nowTime, settings['review.day'], settings['review.time'])
    const week = reviewWeekFor(at.slice(0, 10), settings['review.day'])
    const done = (await reviewRepo(deps.db).completedWeeks(4)).includes(week)
    if (!done) extraTimed.push({ key: `review:${week}`, at, title: 'Weekly review', body: 'About ten minutes', route: '/review' })
  }
  const focus = useFocus.getState().session
  if (focus && settings['focus.endNotification']) {
    const end = new Date(endsAt(focus))
    const pad = (n: number) => String(n).padStart(2, '0')
    extraTimed.push({ key: FOCUS_NOTIFICATION_KEY, at: `${calendarDay(end)}T${pad(end.getHours())}:${pad(end.getMinutes())}`, title: 'Focus done', body: focus.title, route: '/today' })
  }
  const desired = planNotifications({ now, settings, items, counts, extraLines, extraTimed })
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
    dbEvents.subscribe((tables) => dbEvents.affects(tables, ['items', 'settings', 'reviews']) && later()),
    useFocus.subscribe(() => later()),
  ]
  return () => {
    if (timer) clearTimeout(timer)
    offs.forEach((off) => off())
  }
}
