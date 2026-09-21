import type { TodayCard, TodayContext } from '@/core/modules/types'
import { settingsRepo } from '@/core/repos/settings'
import { upcomingKeyDates, upcomingMilestones, type Upcoming } from './logic'
import { workRepo } from './repo'

async function upcoming(ctx: TodayContext): Promise<Upcoming[]> {
  const settings = settingsRepo(ctx.db)
  const within = await settings.get('work.leadDays')
  if (within <= 0) return []
  const repo = workRepo(ctx.db)
  const [projects, progression] = await Promise.all([repo.projects(), repo.progression('milestone')])
  return [...upcomingKeyDates(projects.map((p) => ({ project: p, dates: repo.keyDates(p) })), ctx.calendarToday, within), ...upcomingMilestones(progression, ctx.calendarToday, within * 2)]
}

export async function workToday(ctx: TodayContext): Promise<TodayCard[]> {
  return (await upcoming(ctx)).map((u) => ({ key: `work:${u.key}`, module: 'work', kind: 'event', title: u.title, sub: u.sub, priority: u.daysUntil === 0 ? 1 : 3, href: u.href }))
}

export async function workDigest(ctx: TodayContext): Promise<string[]> {
  if (!(await settingsRepo(ctx.db).get('work.digest'))) return []
  return (await upcoming(ctx)).slice(0, 3).map((u) => `${u.title} ${u.sub ?? ''}`.trim())
}
