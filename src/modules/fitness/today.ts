import { consistency, daysWith } from '@/core/consistency/consistency'
import type { ConsistencyLine, TodayCard, TodayContext } from '@/core/modules/types'
import { logEntriesRepo } from '@/core/repos/logEntries'
import { settingsRepo } from '@/core/repos/settings'
import { fitnessRepo, LOG } from './repo'

/** An unfinished session, and a gentle nudge after a few days without one (never guilt, just a card). */
export async function fitnessToday(ctx: TodayContext): Promise<TodayCard[]> {
  const repo = fitnessRepo(ctx.db)
  const cards: TodayCard[] = []
  const inProgress = await repo.inProgress()
  if (inProgress) cards.push({ key: 'fitness:resume', module: 'fitness', kind: 'nudge', title: inProgress.split ? `Finish ${inProgress.split}` : 'Unfinished session', sub: `${inProgress.exercises.length} exercises`, priority: 3, href: `/m/fitness/workout/${inProgress.id}` })
  const nudgeDays = await settingsRepo(ctx.db).get('fitness.nudgeDays')
  if (nudgeDays > 0) {
    const last = (await repo.workouts(1))[0]
    if (last) {
      const days = Math.floor((ctx.now.getTime() - Date.parse(last.ts)) / 86_400_000)
      if (days >= nudgeDays) cards.push({ key: 'fitness:nudge', module: 'fitness', kind: 'nudge', title: `Gym: ${days} days since ${last.split || 'the last session'}`, priority: 6, href: '/m/fitness' })
    }
  }
  return cards
}

export async function fitnessConsistency(ctx: TodayContext): Promise<ConsistencyLine[]> {
  const logs = logEntriesRepo(ctx.db)
  const since = new Date(ctx.now.getTime() - 9 * 86_400_000).toISOString()
  const gym = consistency(daysWith(await logs.stampsOfType(LOG.workout, since), 0), ctx.today, 7)
  const weigh = consistency(daysWith(await logs.stampsOfType(LOG.bodyweight, since), 0), ctx.today, 7)
  return [
    { label: 'Gym', value: `${gym.hit} of 7` },
    { label: 'Weigh-ins', value: `${weigh.hit} of 7` },
  ]
}
