import { daysBetween, type LocalDay } from '@/core/time/localDay'

/** Days between reviews by confidence 1..5. Low confidence comes back sooner. */
export const REVIEW_INTERVAL_DAYS = [0, 3, 7, 14, 30, 60] as const

export interface RepertoireLike {
  id: string
  confidence: number
  last_reviewed: string | null
}

/** Lines never reviewed, or reviewed longer ago than their confidence allows. Most overdue first. */
export function dueForReview<T extends RepertoireLike>(lines: T[], today: LocalDay): (T & { overdueDays: number })[] {
  const out: (T & { overdueDays: number })[] = []
  for (const l of lines) {
    const interval = REVIEW_INTERVAL_DAYS[Math.min(5, Math.max(1, l.confidence))]!
    const overdueDays = l.last_reviewed ? daysBetween(l.last_reviewed, today) - interval : Number.POSITIVE_INFINITY
    if (overdueDays >= 0) out.push({ ...l, overdueDays })
  }
  return out.sort((a, b) => b.overdueDays - a.overdueDays)
}

export interface TournamentLike {
  id: string
  name: string
  entry_deadline: string | null
  entered: 'no' | 'yes' | 'skipped'
  start_date: string | null
}

export interface TournamentNudge {
  id: string
  title: string
  sub: string
  priority: number
}

/** Keeps nudging from `leadDays` before the entry deadline until the tournament is entered or skipped. */
export function tournamentNudges(list: TournamentLike[], today: LocalDay, leadDays = 14): TournamentNudge[] {
  const out: TournamentNudge[] = []
  for (const t of list) {
    if (t.entered !== 'no' || !t.entry_deadline) continue
    const d = daysBetween(today, t.entry_deadline)
    if (d > leadDays) continue
    if (d < -7) continue
    const when = d < 0 ? `deadline passed ${-d}d ago` : d === 0 ? 'deadline today' : `deadline in ${d}d`
    out.push({ id: t.id, title: `Enter ${t.name}?`, sub: when, priority: d <= 3 ? 0 : 2 })
  }
  return out
}

/** Tree order: parents first, children indented by depth, siblings by sort order then name. */
export function treeOrder<T extends { id: string; parent_id: string | null; sort_order: number; name: string }>(rows: T[]): (T & { depth: number })[] {
  const byParent = new Map<string | null, T[]>()
  for (const r of rows) byParent.set(r.parent_id, [...(byParent.get(r.parent_id) ?? []), r])
  const out: (T & { depth: number })[] = []
  const walk = (parent: string | null, depth: number) => {
    const kids = (byParent.get(parent) ?? []).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    for (const k of kids) {
      out.push({ ...k, depth })
      if (depth < 12) walk(k.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}
