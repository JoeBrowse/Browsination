import { daysWith } from '@/core/consistency/consistency'
import type { ConsistencyLine, TodayContext } from '@/core/modules/types'
import { logEntriesRepo } from '@/core/repos/logEntries'
import { settingsRepo } from '@/core/repos/settings'
import { lastNDays } from '@/core/time/localDay'
import { LOG, alcoholRepo } from './repo'
import { unitsFromGrams, WEEKLY_GUIDELINE_UNITS } from './model'

/** Units in the last seven days against the guideline, and drink-free days. */
export async function alcoholConsistency(ctx: TodayContext): Promise<ConsistencyLine[]> {
  const repo = alcoholRepo(ctx.db)
  const logs = logEntriesRepo(ctx.db)
  const dayStartHour = await settingsRepo(ctx.db).get('dayStartHour')
  const weekAgo = new Date(ctx.now.getTime() - 7 * 86_400_000).toISOString()
  const since = new Date(ctx.now.getTime() - 9 * 86_400_000).toISOString()
  const units = unitsFromGrams(await repo.gramsBetween(weekAgo, ctx.now.toISOString()))
  const drinkDays = daysWith(await logs.stampsOfType(LOG.drink, since), dayStartHour)
  const free = lastNDays(ctx.today, 7).filter((d) => !drinkDays.has(d)).length
  return [
    { label: 'Units', value: `${units.toFixed(1)} of ${WEEKLY_GUIDELINE_UNITS}` },
    { label: 'Drink-free days', value: `${free} of 7` },
  ]
}
