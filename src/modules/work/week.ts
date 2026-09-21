import type { WeekContext, WeekItem } from '@/core/modules/types'
import { workRepo } from './repo'

/** Project key dates and milestones inside the range. */
export async function workWeek(ctx: WeekContext): Promise<WeekItem[]> {
  const repo = workRepo(ctx.db)
  const out: WeekItem[] = []
  for (const p of await repo.projects()) {
    if (p.status === 'done') continue
    for (const k of repo.keyDates(p)) if (k.date >= ctx.from && k.date <= ctx.to) out.push({ key: `date:${p.id}:${k.date}:${k.label}`, date: k.date, title: `${p.name}: ${k.label}`, href: `/m/work/projects/${p.id}` })
  }
  for (const m of await repo.progression('milestone')) if (m.status === 'active' && m.target_date && m.target_date >= ctx.from && m.target_date <= ctx.to) out.push({ key: `milestone:${m.id}`, date: m.target_date, title: m.title, sub: 'milestone', href: '/m/work/progression' })
  return out
}
