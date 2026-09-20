import type { SqlDriver } from '@/core/db/driver'
import { onForeground } from '@/core/platform/appEvents'
import { fetchText } from '@/core/platform/http'
import { createSyncRunner, type SyncSummary } from './sync'

let runner: ReturnType<typeof createSyncRunner> | null = null

/** Started once at boot: syncs on start and whenever the app returns to the foreground. */
export function startCalendarSync(db: SqlDriver): () => void {
  runner = createSyncRunner(db, fetchText)
  void runner.run(true)
  const off = onForeground(() => void runner?.run())
  return () => {
    off()
    runner = null
  }
}

/** Manual refresh from the calendar screen. */
export function refreshCalendars(): Promise<SyncSummary> {
  return runner ? runner.run(true) : Promise.resolve({ calendars: 0, events: 0, errors: ['not started'] })
}
