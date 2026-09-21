import { consistency, daysWith } from '@/core/consistency/consistency'
import type { ConsistencyLine, TodayContext } from '@/core/modules/types'
import { settingsRepo } from '@/core/repos/settings'
import { brainRepo, LOG } from './repo'

/** Mood, meditation, stretch and every habit as "x of 7". */
export async function brainConsistency(ctx: TodayContext): Promise<ConsistencyLine[]> {
  const repo = brainRepo(ctx.db)
  const dayStartHour = await settingsRepo(ctx.db).get('dayStartHour')
  const since = new Date(ctx.now.getTime() - 9 * 86_400_000).toISOString()
  const line = async (label: string, type: string, entityId?: string, target?: number): Promise<ConsistencyLine> => {
    const c = consistency(daysWith(await repo.stampsFor(type, since, entityId), dayStartHour), ctx.today, 7, target)
    return { label, value: `${c.hit} of 7${target ? ` (aim ${target})` : ''}` }
  }
  const out = [await line('Mood', LOG.mood), await line('Meditation', LOG.meditation), await line('Stretch', LOG.stretch)]
  for (const h of await repo.listHabits()) out.push(await line(h.name, LOG.habit, h.id, h.target_per_week ?? undefined))
  return out
}
