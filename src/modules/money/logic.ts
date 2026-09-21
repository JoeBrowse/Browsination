import { addDays, daysBetween, type LocalDay } from '@/core/time/localDay'
import type { AccountKind, AccountRow, GoalRow, HoldingRow, SnapshotRow } from './repo'

/** Kinds whose balance is money owed. */
export const LIABILITY_KINDS: ReadonlySet<AccountKind> = new Set<AccountKind>(['credit'])

export const signedBalance = (kind: AccountKind, pence: number): number => (LIABILITY_KINDS.has(kind) ? -pence : pence)

export interface NetWorthPoint {
  day: LocalDay
  pence: number
}

/**
 * Net worth on every day a balance was logged: the latest known balance of every unarchived
 * account, liabilities subtracted. Holdings are not added on top, an ISA's balance already holds them.
 */
export function netWorthSeries(accounts: Pick<AccountRow, 'id' | 'kind' | 'archived'>[], snapshots: Pick<SnapshotRow, 'account_id' | 'day' | 'balance_pence'>[]): NetWorthPoint[] {
  const kinds = new Map(accounts.filter((a) => !a.archived).map((a) => [a.id, a.kind] as const))
  const latest = new Map<string, number>()
  const out: NetWorthPoint[] = []
  const sorted = [...snapshots].filter((s) => kinds.has(s.account_id)).sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!
    latest.set(s.account_id, signedBalance(kinds.get(s.account_id)!, s.balance_pence))
    const next = sorted[i + 1]
    if (next && next.day === s.day) continue
    let total = 0
    for (const v of latest.values()) total += v
    out.push({ day: s.day, pence: total })
  }
  return out
}

export const netWorthNow = (series: NetWorthPoint[]): number | null => series[series.length - 1]?.pence ?? null

/** Value at the latest point on or before `day` (null if none). */
export function valueOn(series: NetWorthPoint[], day: LocalDay): number | null {
  let v: number | null = null
  for (const p of series) {
    if (p.day > day) break
    v = p.pence
  }
  return v
}

/** One point per month (the last logged that month), for the trend line. */
export function monthlyPoints(series: NetWorthPoint[]): NetWorthPoint[] {
  const byMonth = new Map<string, NetWorthPoint>()
  for (const p of series) byMonth.set(p.day.slice(0, 7), p)
  return [...byMonth.values()]
}

export const monthKey = (day: LocalDay): string => day.slice(0, 7)

/** Change over roughly a month: now against the value logged on or before this day last month. */
export function monthChange(series: NetWorthPoint[], today: LocalDay): number | null {
  const now = netWorthNow(series)
  const then = valueOn(series, addDays(today, -30))
  return now === null || then === null ? null : now - then
}

/** Balance over limit, 0..1+ (null without a limit). */
export function utilisation(balance: number | null, limit: number | null): number | null {
  if (balance === null || !limit || limit <= 0) return null
  return Math.max(0, balance) / limit
}

const daysInMonth = (year: number, month1: number): number => new Date(Date.UTC(year, month1, 0)).getUTCDate()

/** Next occurrence of a day-of-month on or after today, clamped to the month's length. */
export function nextDueDate(today: LocalDay, dueDay: number): LocalDay {
  const [y, m] = today.split('-').map(Number) as [number, number]
  const build = (year: number, month1: number) => `${year}-${String(month1).padStart(2, '0')}-${String(Math.min(dueDay, daysInMonth(year, month1))).padStart(2, '0')}`
  const thisMonth = build(y, m)
  if (thisMonth >= today) return thisMonth
  return m === 12 ? build(y + 1, 1) : build(y, m + 1)
}

export interface GoalProgress {
  saved: number
  target: number
  fraction: number
  remaining: number
  /** Pence per month to hit the deadline (null without a deadline or when already there). */
  monthly: number | null
  monthsLeft: number | null
}

/** Months until the deadline, rounded up, never less than one. */
export function monthsUntil(today: LocalDay, deadline: LocalDay): number {
  return Math.max(1, Math.ceil(daysBetween(today, deadline) / 30.44))
}

export function goalProgress(goal: Pick<GoalRow, 'target_pence' | 'saved_pence' | 'account_id' | 'deadline'>, accountBalance: number | null, today: LocalDay): GoalProgress {
  const saved = goal.account_id ? Math.max(0, accountBalance ?? 0) : goal.saved_pence
  const target = Math.max(0, goal.target_pence)
  const remaining = Math.max(0, target - saved)
  const fraction = target > 0 ? Math.min(1, saved / target) : 1
  const monthsLeft = goal.deadline ? monthsUntil(today, goal.deadline) : null
  const monthly = remaining > 0 && monthsLeft ? Math.ceil(remaining / monthsLeft) : null
  return { saved, target, fraction, remaining, monthly, monthsLeft }
}

export interface HoldingValue {
  value: number | null
  gain: number | null
  gainPct: number | null
}

export function holdingValue(h: Pick<HoldingRow, 'quantity' | 'cost_pence' | 'price_pence'>): HoldingValue {
  if (h.price_pence === null) return { value: null, gain: null, gainPct: null }
  const value = Math.round(h.quantity * h.price_pence)
  const gain = value - h.cost_pence
  return { value, gain, gainPct: h.cost_pence > 0 ? gain / h.cost_pence : null }
}

/** The check-in is due from the check-in day of each month until one is logged in that month. */
export function checkInDue(today: LocalDay, checkInDay: number, lastCheckInDay: LocalDay | null): boolean {
  const [y, m] = today.split('-').map(Number) as [number, number]
  const dueDay = `${y}-${String(m).padStart(2, '0')}-${String(Math.min(checkInDay, daysInMonth(y, m))).padStart(2, '0')}`
  if (today < dueDay) return false
  return !lastCheckInDay || monthKey(lastCheckInDay) < monthKey(today)
}

/** Payment reminders: one per card per due date inside the window, `leadDays` before it (or today if that has passed). */
export function paymentDates(today: LocalDay, dueDay: number, leadDays: number, windowDays = 14): { due: LocalDay; remindOn: LocalDay }[] {
  const out: { due: LocalDay; remindOn: LocalDay }[] = []
  let due = nextDueDate(today, dueDay)
  while (daysBetween(today, due) <= windowDays) {
    const remindOn = addDays(due, -leadDays)
    out.push({ due, remindOn: remindOn < today ? today : remindOn })
    due = nextDueDate(addDays(due, 1), dueDay)
  }
  return out
}
