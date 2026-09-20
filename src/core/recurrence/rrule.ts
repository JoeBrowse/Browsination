import { addDays, daysBetween, type LocalDay } from '../time/localDay'

/**
 * Recurrence on civil days, stored as an RFC 5545 RRULE subset:
 *   FREQ=DAILY|WEEKLY|MONTHLY|YEARLY ; INTERVAL=n ; BYDAY=MO,TU,... (weekly only)
 * "Every N days" is FREQ=DAILY;INTERVAL=N. No UTC anywhere: a task due on a day is due on that day.
 */
export type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface Rule {
  freq: Freq
  interval: number
  /** 0 = Monday … 6 = Sunday. Weekly only. */
  byDay?: number[]
}

const DAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function parseRule(text: string | null | undefined): Rule | null {
  if (!text) return null
  const parts = Object.fromEntries(
    text
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => p.split('=') as [string, string]),
  )
  const freq = parts.FREQ as Freq | undefined
  if (!freq || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null
  const interval = Math.max(1, Number(parts.INTERVAL ?? 1) || 1)
  const rule: Rule = { freq, interval }
  if (freq === 'WEEKLY' && parts.BYDAY) {
    const days = parts.BYDAY.split(',')
      .map((d) => DAY_CODES.indexOf(d.trim()))
      .filter((d) => d >= 0)
    if (days.length) rule.byDay = [...new Set(days)].sort((a, b) => a - b)
  }
  return rule
}

export function formatRule(rule: Rule): string {
  const out = [`FREQ=${rule.freq}`]
  if (rule.interval > 1) out.push(`INTERVAL=${rule.interval}`)
  if (rule.freq === 'WEEKLY' && rule.byDay?.length) out.push(`BYDAY=${rule.byDay.map((d) => DAY_CODES[d]).join(',')}`)
  return out.join(';')
}

export function describeRule(rule: Rule): string {
  const n = rule.interval
  const days = rule.freq === 'WEEKLY' && rule.byDay?.length ? ` on ${rule.byDay.map((d) => DAY_NAMES[d]).join(', ')}` : ''
  if (n === 1) return ({ DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly' } as const)[rule.freq] + days
  const unit = ({ DAILY: 'days', WEEKLY: 'weeks', MONTHLY: 'months', YEARLY: 'years' } as const)[rule.freq]
  return `Every ${n} ${unit}${days}`
}

function split(day: LocalDay): [number, number, number] {
  return day.split('-').map(Number) as [number, number, number]
}
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
function makeDay(y: number, m: number, d: number): LocalDay {
  // normalise month overflow, then clamp the day into the month
  const t = new Date(Date.UTC(y, m - 1, 1))
  const yy = t.getUTCFullYear()
  const mm = t.getUTCMonth() + 1
  const dd = Math.min(d, daysInMonth(yy, mm))
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}
/** 0 = Monday … 6 = Sunday. */
export function weekday(day: LocalDay): number {
  const [y, m, d] = split(day)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/** First occurrence strictly after `after`, on the series anchored at `anchor`. */
export function nextOccurrence(rule: Rule, anchor: LocalDay, after: LocalDay): LocalDay {
  if (rule.freq === 'DAILY' || (rule.freq === 'WEEKLY' && !rule.byDay?.length)) {
    const step = rule.interval * (rule.freq === 'WEEKLY' ? 7 : 1)
    const n = daysBetween(anchor, after)
    if (n < 0) return anchor
    return addDays(anchor, (Math.floor(n / step) + 1) * step)
  }
  if (rule.freq === 'WEEKLY') {
    const byDay = rule.byDay!
    const anchorMonday = addDays(anchor, -weekday(anchor))
    const startMonday = after < anchorMonday ? anchorMonday : addDays(after, -weekday(after))
    for (let w = 0; w < 600; w++) {
      const monday = addDays(startMonday, w * 7)
      const weeksFromAnchor = Math.round(daysBetween(anchorMonday, monday) / 7)
      if (weeksFromAnchor % rule.interval !== 0) continue
      for (const d of byDay) {
        const day = addDays(monday, d)
        if (day > after && day >= anchor) return day
      }
    }
    return addDays(after, 1)
  }
  const [ay, am, ad] = split(anchor)
  for (let i = 0; i < 1200; i++) {
    const day = rule.freq === 'MONTHLY' ? makeDay(ay, am + i * rule.interval, ad) : makeDay(ay + i * rule.interval, am, ad)
    if (day > after) return day
  }
  return addDays(after, 1)
}

export const PRESETS: { label: string; rule: Rule | null }[] = [
  { label: 'Never', rule: null },
  { label: 'Daily', rule: { freq: 'DAILY', interval: 1 } },
  { label: 'Weekly', rule: { freq: 'WEEKLY', interval: 1 } },
  { label: 'Monthly', rule: { freq: 'MONTHLY', interval: 1 } },
  { label: 'Yearly', rule: { freq: 'YEARLY', interval: 1 } },
]
