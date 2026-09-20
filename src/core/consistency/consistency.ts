import { addDays, lastNDays, localDayOf, type LocalDay } from '../time/localDay'

export interface Stamp {
  ts: string
  tz_offset_min: number
}

/** Distinct local days (day-start rule applied) that have at least one stamp. */
export function daysWith(stamps: Stamp[], dayStartHour: number): Set<LocalDay> {
  const out = new Set<LocalDay>()
  for (const s of stamps) out.add(localDayOf(s.ts, s.tz_offset_min, dayStartHour))
  return out
}

export interface Consistency {
  hit: number
  window: number
  /** Oldest first, ending today. */
  grid: boolean[]
  /** Only when a weekly target is known. */
  targetMet?: boolean
}

/**
 * "x of the last N days". Never a streak: a missed day changes nothing but the count.
 * Today counts if logged; an unlogged today is not a miss yet.
 */
export function consistency(days: Set<LocalDay>, today: LocalDay, window = 7, targetPerWeek?: number): Consistency {
  const range = lastNDays(today, window)
  const grid = range.map((d) => days.has(d))
  const hit = grid.filter(Boolean).length
  const out: Consistency = { hit, window, grid }
  if (targetPerWeek !== undefined) out.targetMet = hit >= Math.round((targetPerWeek * window) / 7)
  return out
}

export interface HeatWeek {
  monday: LocalDay
  days: { day: LocalDay; hit: boolean; future: boolean }[]
}

/** Weeks × 7 grid, Monday first, oldest week first, ending with the current week. */
export function heatmap(days: Set<LocalDay>, today: LocalDay, weeks = 12): HeatWeek[] {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number]
  const wd = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  const thisMonday = addDays(today, -wd)
  const out: HeatWeek[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const monday = addDays(thisMonday, -7 * w)
    out.push({
      monday,
      days: Array.from({ length: 7 }, (_, i) => {
        const day = addDays(monday, i)
        return { day, hit: days.has(day), future: day > today }
      }),
    })
  }
  return out
}

/** Short label: "5 of 7". */
export function consistencyLabel(c: Consistency): string {
  return `${c.hit} of ${c.window}`
}
