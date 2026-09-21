import { consistency, daysWith } from '@/core/consistency/consistency'
import type { ConsistencyLine, TodayContext, WeekContext, WeekItem } from '@/core/modules/types'
import { settingsRepo } from '@/core/repos/settings'
import { snookerRepo } from './repo'

export async function snookerWeek(ctx: WeekContext): Promise<WeekItem[]> {
  const repo = snookerRepo(ctx.db)
  return (await repo.league.fixturesBetween(ctx.from, ctx.to)).map((f) => ({ key: `fixture:${f.id}`, date: f.date, title: `Snooker v ${f.opponent_team || f.opponent || 'TBC'}`, href: '/m/snooker/league' }))
}

export async function snookerConsistency(ctx: TodayContext): Promise<ConsistencyLine[]> {
  const repo = snookerRepo(ctx.db)
  const dayStartHour = await settingsRepo(ctx.db).get('dayStartHour')
  const since = new Date(ctx.now.getTime() - 9 * 86_400_000).toISOString()
  const c = consistency(daysWith(await repo.practiceStamps(since), dayStartHour), ctx.today, 7)
  return [{ label: 'Practice', value: `${c.hit} of 7` }]
}
