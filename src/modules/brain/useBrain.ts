import { useMemo } from 'react'
import { useServices } from '@/app/services'
import { consistency, daysWith, type Consistency } from '@/core/consistency/consistency'
import { addDays, todayLocal, type LocalDay } from '@/core/time/localDay'
import { useQuery } from '@/core/ui/useQuery'
import { brainRepo, LOG, type HabitRow } from './repo'

export function useBrainRepo() {
  const s = useServices()
  return useMemo(() => brainRepo(s.db), [s.db])
}

export interface HabitWithStats {
  habit: HabitRow
  tickedToday: boolean
  week: Consistency
}

/** Today's logical day, the check-in entries and every habit with its 7-day consistency. */
export function useCheckIn() {
  const s = useServices()
  const repo = useBrainRepo()
  return useQuery(
    async () => {
      const dayStartHour = await s.settings.get('dayStartHour')
      const today: LocalDay = todayLocal(new Date(), dayStartHour)
      const [mood, sleep, meditation, stretch, habits, ticks] = await Promise.all([
        repo.entriesOn(LOG.mood, today, dayStartHour),
        repo.entriesOn(LOG.sleep, today, dayStartHour),
        repo.entriesOn(LOG.meditation, today, dayStartHour),
        repo.entriesOn(LOG.stretch, today, dayStartHour),
        repo.listHabits(),
        repo.habitTicksOn(today, dayStartHour),
      ])
      const since = new Date(Date.parse(`${addDays(today, -8)}T00:00:00Z`) - 86_400_000).toISOString()
      const stats: HabitWithStats[] = []
      for (const habit of habits) {
        const stamps = await repo.stampsFor(LOG.habit, since, habit.id)
        stats.push({ habit, tickedToday: ticks.has(habit.id), week: consistency(daysWith(stamps, dayStartHour), today, 7, habit.target_per_week) })
      }
      const lastMeditation = await repo.logs.lastOfType(LOG.meditation)
      return { today, dayStartHour, mood: mood[0] ?? null, sleep: sleep[0] ?? null, meditation, stretch: stretch[0] ?? null, habits: stats, lastMeditationMinutes: lastMeditation?.value ?? 10 }
    },
    ['log_entries', 'habits', 'settings'],
  )
}

export type CheckInData = NonNullable<ReturnType<typeof useCheckIn>['data']>
