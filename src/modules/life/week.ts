import type { WeekContext, WeekItem } from '@/core/modules/types'
import { nextBirthday } from './logic'
import { lifeRepo } from './repo'

/** Birthdays, trips, planned date nights and life admin due inside the range. */
export async function lifeWeek(ctx: WeekContext): Promise<WeekItem[]> {
  const repo = lifeRepo(ctx.db)
  const out: WeekItem[] = []
  for (const p of await repo.people.list()) {
    if (!p.birthday) continue
    const n = nextBirthday(p.birthday, ctx.from)
    if (n && n.day >= ctx.from && n.day <= ctx.to) out.push({ key: `bday:${p.id}`, date: n.day, title: `${p.name}'s birthday`, sub: n.age ? `turning ${n.age}` : undefined, href: `/m/life/people/${p.id}` })
  }
  for (const t of await repo.tripsBetween(ctx.from, ctx.to)) out.push({ key: `trip:${t.id}`, date: t.start_date!, title: t.name, sub: 'trip', href: `/m/life/trips/${t.id}` })
  for (const d of await repo.dateNightsBetween(ctx.from, ctx.to)) out.push({ key: `date:${d.id}`, date: d.date!, title: d.title, sub: 'date night', href: '/m/life/dates' })
  for (const a of await repo.admin()) if (a.due_date && a.due_date >= ctx.from && a.due_date <= ctx.to) out.push({ key: `admin:${a.id}`, date: a.due_date, title: a.name, sub: a.kind, href: '/m/life/admin' })
  return out
}
