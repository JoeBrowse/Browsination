import type { Settings } from '../settings/schema'
import { addDays, calendarDay, type LocalDay } from '../time/localDay'
import { notificationId, type PlannedNotification } from './types'

export interface PlannerItem {
  id: string
  title: string
  status: string
  /** Local wall clock 'YYYY-MM-DDTHH:MM'. */
  reminder_at: string | null
  due_date: string | null
}

export interface DigestCounts {
  dueToday: number
  overdue: number
  focus: number
  doneToday: number
  dueTomorrow: number
}

export interface PlannerInput {
  now: Date
  settings: Pick<Settings, 'notifications.enabled' | 'notifications.morningDigest' | 'notifications.eveningDigest' | 'notifications.timed'>
  items: PlannerItem[]
  counts: DigestCounts
  /** Module lines appended to the morning digest. */
  extraLines?: string[]
  /** How far ahead individual reminders are scheduled. */
  windowDays?: number
}

export const DIGEST_KEYS = { morning: 'digest:morning', evening: 'digest:evening' } as const
const OPEN_STATUSES = new Set(['inbox', 'todo', 'waiting'])

/** Local wall clock text -> instant in the device zone. */
export function wallClockToDate(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number) as number[]
  return new Date(y!, mo! - 1, d!, h!, mi!, 0, 0)
}

/** Next occurrence of a local 'HH:MM' strictly after `now`. */
export function nextDaily(time: string, now: Date): Date {
  const [h, m] = time.split(':').map(Number) as [number, number]
  const today = calendarDay(now)
  const candidate = wallClockToDate(`${today}T${pad(h)}:${pad(m)}`)!
  if (candidate.getTime() > now.getTime()) return candidate
  return wallClockToDate(`${addDays(today, 1)}T${pad(h)}:${pad(m)}`)!
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Pure: turns settings, open items and today's counts into the exact set of notifications
 * that should exist right now. Reminders are one-shots within the window; the two digests
 * are the next occurrence only (re-planned on every reconcile, so their text stays fresh).
 */
export function planNotifications(input: PlannerInput): PlannedNotification[] {
  const { now, settings, items, counts } = input
  if (!settings['notifications.enabled']) return []
  const out: PlannedNotification[] = []
  const windowMs = (input.windowDays ?? 14) * 86_400_000

  if (settings['notifications.timed']) {
    for (const it of items) {
      if (!it.reminder_at || !OPEN_STATUSES.has(it.status)) continue
      const at = wallClockToDate(it.reminder_at)
      if (!at) continue
      const delta = at.getTime() - now.getTime()
      if (delta <= 0 || delta > windowMs) continue
      const key = `item:${it.id}`
      out.push({ id: notificationId(key), key, at: at.toISOString(), title: it.title, body: it.due_date ? `Due ${it.due_date}` : '', channel: 'timed', route: '/inbox' })
    }
  }

  const morning = settings['notifications.morningDigest']
  if (morning.enabled) {
    out.push({
      id: notificationId(DIGEST_KEYS.morning),
      key: DIGEST_KEYS.morning,
      at: nextDaily(morning.time, now).toISOString(),
      title: 'Today',
      body: [morningBody(counts), ...(input.extraLines ?? [])].join('\n'),
      channel: 'digest',
      route: '/today',
    })
  }
  const evening = settings['notifications.eveningDigest']
  if (evening.enabled) {
    out.push({
      id: notificationId(DIGEST_KEYS.evening),
      key: DIGEST_KEYS.evening,
      at: nextDaily(evening.time, now).toISOString(),
      title: 'Evening',
      body: eveningBody(counts),
      channel: 'digest',
      route: '/today',
    })
  }
  return out.sort((a, b) => (a.at < b.at ? -1 : 1))
}

export function morningBody(c: DigestCounts): string {
  const parts: string[] = []
  if (c.focus) parts.push(`${c.focus} focus`)
  if (c.dueToday) parts.push(`${c.dueToday} due today`)
  if (c.overdue) parts.push(`${c.overdue} overdue`)
  return parts.length ? parts.join(' · ') : 'Nothing due today'
}

export function eveningBody(c: DigestCounts): string {
  const parts: string[] = []
  if (c.doneToday) parts.push(`${c.doneToday} done today`)
  if (c.dueTomorrow) parts.push(`${c.dueTomorrow} due tomorrow`)
  return parts.length ? parts.join(' · ') : 'Nothing due tomorrow'
}

export type { LocalDay }
