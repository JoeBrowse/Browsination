import { localDayOf, type LocalDay } from '@/core/time/localDay'
import { remainingAt, SLEEP_THRESHOLD_MG, type Dose } from './caffeine'

/**
 * The one-a-day coffee habit: how today stands against the target, when it clears, and how the
 * last seven days went. Forgiving by design: a day at or under the target counts, zero counts,
 * and going over is stated as a fact ("2nd today"), never as a failure.
 */
export interface CupLike {
  ts: string
  tz_offset_min: number
  /** mg. */
  value: number | null
  payload: Record<string, unknown>
}

export interface DayStatus {
  cups: number
  mg: number
  /** Instant of the first cup today. */
  firstMs: number | null
  lastMs: number | null
  target: number
  /** Cups still within the target (0 once it is met). */
  left: number
  /** The last cup was after the cut-off time. */
  late: boolean
}

const timeOf = (ms: number): string => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function dayStatus(today: CupLike[], target: number, latestTime: string): DayStatus {
  const sorted = [...today].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
  const mg = sorted.reduce((n, c) => n + (c.value ?? 0), 0)
  const firstMs = sorted.length ? Date.parse(sorted[0]!.ts) : null
  const lastMs = sorted.length ? Date.parse(sorted[sorted.length - 1]!.ts) : null
  return { cups: sorted.length, mg, firstMs, lastMs, target, left: Math.max(0, target - sorted.length), late: lastMs !== null && timeOf(lastMs) > latestTime }
}

/** "1 of 1", "2 of 1" — the count, never a verdict. */
export const cupsLabel = (s: DayStatus): string => `${s.cups} of ${s.target}`

/** Ordinal for the cup about to be logged: "2nd today". */
export function nthLabel(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix} today`
}

/**
 * When the caffeine still in the system falls below the level that usually matters for sleep.
 * Searched in ten-minute steps out to 24 hours; null when it is already below it or still above at the end.
 */
export function clearAt(doses: Dose[], fromMs: number, halfLifeHours: number, threshold = SLEEP_THRESHOLD_MG): number | null {
  if (doses.length === 0) return null
  if (remainingAt(doses, fromMs, halfLifeHours) < threshold) return null
  const step = 10 * 60_000
  for (let t = fromMs; t <= fromMs + 24 * 3_600_000; t += step) {
    if (remainingAt(doses, t, halfLifeHours) < threshold) return t
  }
  return null
}

export interface WeekSummary {
  /** Days at or under the target, out of the window. */
  within: number
  window: number
  /** Cups per day across the window. */
  average: number
  /** Days with no caffeine at all. */
  none: number
  /** Oldest first, ending today. */
  perDay: { day: LocalDay; cups: number }[]
}

/** Per-day cup counts over the window ending today, with the day-start-hour rule applied. */
export function weekSummary(cups: CupLike[], days: LocalDay[], target: number, dayStartHour: number): WeekSummary {
  const counts = new Map<LocalDay, number>(days.map((d) => [d, 0]))
  for (const c of cups) {
    const day = localDayOf(c.ts, c.tz_offset_min, dayStartHour)
    if (counts.has(day)) counts.set(day, counts.get(day)! + 1)
  }
  const perDay = days.map((day) => ({ day, cups: counts.get(day) ?? 0 }))
  const total = perDay.reduce((n, d) => n + d.cups, 0)
  return {
    within: perDay.filter((d) => d.cups <= target).length,
    window: days.length,
    average: days.length ? Math.round((total / days.length) * 10) / 10 : 0,
    none: perDay.filter((d) => d.cups === 0).length,
    perDay,
  }
}
