import type { PersonRow } from '@/core/repos/people'
import { daysBetween, type LocalDay } from '@/core/time/localDay'

export { parsePounds, pounds, sparklinePath } from '@/core/ui/format'

/** Next occurrence of a birthday ('YYYY-MM-DD' or '--MM-DD') on or after today. */
export function nextBirthday(birthday: string, today: LocalDay): { day: LocalDay; daysUntil: number; age: number | null } | null {
  const m = /^(\d{4}|-)-(\d{2})-(\d{2})$/.exec(birthday)
  if (!m) return null
  const [, y, mm, dd] = m as unknown as [string, string, string, string]
  const year = Number(today.slice(0, 4))
  const make = (yy: number) => {
    // 29 Feb falls back to 28 Feb in non-leap years
    const d = new Date(Date.UTC(yy, Number(mm) - 1, Number(dd)))
    if (d.getUTCMonth() + 1 !== Number(mm)) return `${yy}-${mm}-28`
    return d.toISOString().slice(0, 10)
  }
  let day = make(year)
  if (day < today) day = make(year + 1)
  const age = y === '-' ? null : Number(day.slice(0, 4)) - Number(y)
  return { day, daysUntil: daysBetween(today, day), age }
}

export interface Nudge {
  key: string
  title: string
  sub?: string
  priority: number
  href?: string
}

export function birthdayNudges(people: PersonRow[], today: LocalDay, leadDays: number[]): Nudge[] {
  const out: Nudge[] = []
  for (const p of people) {
    if (!p.birthday) continue
    const n = nextBirthday(p.birthday, today)
    if (!n) continue
    if (n.daysUntil === 0) out.push({ key: `bday:${p.id}`, title: `${p.name}'s birthday today`, sub: n.age ? `${n.age}` : undefined, priority: 0, href: `/m/life/people/${p.id}` })
    else if (leadDays.includes(n.daysUntil))
      out.push({ key: `bday:${p.id}`, title: `${p.name}'s birthday in ${n.daysUntil} days`, sub: n.age ? `turning ${n.age}` : undefined, priority: 2, href: `/m/life/people/${p.id}` })
  }
  return out
}

export function keepInTouchNudges(people: PersonRow[], now: Date): Nudge[] {
  const out: Nudge[] = []
  for (const p of people) {
    if (!p.keep_in_touch_days) continue
    const last = p.last_contacted_at ? Date.parse(p.last_contacted_at) : null
    const days = last ? Math.floor((now.getTime() - last) / 86_400_000) : null
    if (days === null || days >= p.keep_in_touch_days) out.push({ key: `kit:${p.id}`, title: `Contact ${p.name}`, sub: days === null ? 'never' : `${days} days`, priority: 4, href: `/m/life/people/${p.id}` })
  }
  return out
}

export interface AdminLike {
  id: string
  kind: string
  name: string
  due_date: string | null
}

export function adminNudges(items: AdminLike[], today: LocalDay, leadDays: number): Nudge[] {
  if (leadDays <= 0) return []
  const out: Nudge[] = []
  for (const a of items) {
    if (!a.due_date) continue
    const d = daysBetween(today, a.due_date)
    if (d > leadDays) continue
    const when = d < 0 ? `${-d} days overdue` : d === 0 ? 'today' : `in ${d} days`
    out.push({ key: `admin:${a.id}`, title: `${a.name} ${when}`, sub: a.kind, priority: d <= 0 ? 0 : 2, href: '/m/life/admin' })
  }
  return out
}
