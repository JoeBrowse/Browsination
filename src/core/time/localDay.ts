/**
 * Two kinds of time live in the database:
 *  - instants (things that happened): ISO 8601 UTC strings plus the device offset at write time
 *  - civil dates/times (things that are scheduled): 'YYYY-MM-DD' and 'HH:MM' with no zone
 *
 * "Which day does this log belong to" is never stored. It is computed here from the instant,
 * the offset captured with it, and the day-start-hour setting (04:00 by default), so changing
 * the setting never requires rewriting history.
 */
export type LocalDay = string // 'YYYY-MM-DD'

const pad = (n: number) => String(n).padStart(2, '0')

/** Minutes east of UTC for the device zone at the given instant (local minus UTC). */
export function tzOffsetMin(d: Date = new Date()): number {
  return -d.getTimezoneOffset()
}

/** The local day an instant falls in, after applying the day-start hour. */
export function localDayOf(tsIso: string, offsetMin: number, dayStartHour = 0): LocalDay {
  const ms = Date.parse(tsIso) + offsetMin * 60_000 - dayStartHour * 3_600_000
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Today's local day (device zone) after applying the day-start hour. */
export function todayLocal(now: Date = new Date(), dayStartHour = 0): LocalDay {
  return localDayOf(now.toISOString(), tzOffsetMin(now), dayStartHour)
}

/** Plain calendar date of an instant in the device zone (no day-start shift). */
export function calendarDay(d: Date = new Date()): LocalDay {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(day: LocalDay, n: number): LocalDay {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/** Days from `day - (n-1)` up to and including `day`, ascending. */
export function lastNDays(day: LocalDay, n: number): LocalDay[] {
  return Array.from({ length: n }, (_, i) => addDays(day, i - (n - 1)))
}

/** Whole days between two local days (b - a). */
export function daysBetween(a: LocalDay, b: LocalDay): number {
  const toMs = (s: LocalDay) => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number]
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toMs(b) - toMs(a)) / 86_400_000)
}

/** Fields every log write needs. */
export function stampNow(now: Date = new Date()): { ts: string; tz_offset_min: number } {
  return { ts: now.toISOString(), tz_offset_min: tzOffsetMin(now) }
}

/** Instant range [day at dayStartHour, next day at dayStartHour) in the device zone. */
export function logDayRange(day: LocalDay, dayStartHour: number): { from: string; to: string } {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const from = new Date(y, m - 1, d, dayStartHour, 0, 0, 0)
  const to = new Date(y, m - 1, d + 1, dayStartHour, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** Format a civil day for display: 'Mon 21 Sep'. */
export function formatDay(day: LocalDay): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}
