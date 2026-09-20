import type { SqlDriver } from '@/core/db/driver'
import { dbEvents } from '@/core/db/events'
import { expandEvents, parseIcs } from './ics'
import { chessRepo } from './repo'

export const WINDOW_BACK_DAYS = 7
export const WINDOW_AHEAD_DAYS = 60

export interface SyncSummary {
  calendars: number
  events: number
  errors: string[]
}

/** Fetches every enabled calendar feed and replaces its cached window. Errors are stored per calendar, never thrown. */
export async function syncCalendars(db: SqlDriver, fetchText: (url: string) => Promise<string>, now: Date = new Date()): Promise<SyncSummary> {
  const repo = chessRepo(db)
  const fromMs = now.getTime() - WINDOW_BACK_DAYS * 86_400_000
  const toMs = now.getTime() + WINDOW_AHEAD_DAYS * 86_400_000
  const summary: SyncSummary = { calendars: 0, events: 0, errors: [] }
  for (const cal of await repo.calendars()) {
    if (!cal.enabled) continue
    summary.calendars += 1
    try {
      const text = await fetchText(cal.url)
      const occ = expandEvents(parseIcs(text), fromMs, toMs)
      await repo.replaceEvents(cal.id, occ, new Date(fromMs).toISOString(), new Date(toMs).toISOString())
      await repo.updateCalendar(cal.id, { last_synced_at: now.toISOString(), last_error: null })
      summary.events += occ.length
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      summary.errors.push(`${cal.name}: ${message}`)
      await repo.updateCalendar(cal.id, { last_error: message })
    }
  }
  dbEvents.emit('calendar_events')
  return summary
}

/** Throttle: at most one automatic sync per `minIntervalMs`. */
export function createSyncRunner(db: SqlDriver, fetchText: (url: string) => Promise<string>, minIntervalMs = 5 * 60_000) {
  let last = 0
  let running: Promise<SyncSummary> | null = null
  return {
    run(force = false): Promise<SyncSummary> {
      if (running) return running
      if (!force && Date.now() - last < minIntervalMs) return Promise.resolve({ calendars: 0, events: 0, errors: [] })
      last = Date.now()
      running = syncCalendars(db, fetchText).finally(() => {
        running = null
      })
      return running
    },
  }
}
