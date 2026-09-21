import { consistency, daysWith } from '@/core/consistency/consistency'
import type { ConsistencyLine, TodayContext } from '@/core/modules/types'
import { settingsRepo } from '@/core/repos/settings'
import { banjoRepo, LOG } from './repo'

export async function banjoConsistency(ctx: TodayContext): Promise<ConsistencyLine[]> {
  const repo = banjoRepo(ctx.db)
  const dayStartHour = await settingsRepo(ctx.db).get('dayStartHour')
  const since = new Date(ctx.now.getTime() - 9 * 86_400_000).toISOString()
  const weekAgo = new Date(ctx.now.getTime() - 7 * 86_400_000).toISOString()
  const c = consistency(daysWith(await repo.practiceStamps(since), dayStartHour), ctx.today, 7)
  const minutes = await repo.minutesSince(weekAgo)
  const reviews = consistency(daysWith(await repo.logs.stampsOfType(LOG.review, since), dayStartHour), ctx.today, 7)
  return [
    { label: 'Practice', value: `${c.hit} of 7 · ${Math.round(minutes)} min` },
    { label: 'Reviews', value: `${reviews.hit} of 7` },
  ]
}
