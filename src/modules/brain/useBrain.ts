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

/**
 * The check-in entries for a day (today unless one is given) and every habit with its 7-day
 * consistency, so an earlier day can be filled in from the same panel.
 */
export function useCheckIn(day?: LocalDay) {
  const s = useServices()
  const repo = useBrainRepo()
  return useQuery(
    async () => {
      const dayStartHour = await s.settings.get('dayStartHour')
      const realToday: LocalDay = todayLocal(new Date(), dayStartHour)
      const today: LocalDay = day ?? realToday
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
      // The morning after a drinking session the check-in asks one extra question (Stage 6).
      const yesterdayDrinks = await repo.entriesOn('drink', addDays(today, -1), dayStartHour)
      const morningAfter = (await repo.entriesOn('morning_after', today, dayStartHour))[0] ?? null
      const unitsYesterday = yesterdayDrinks.reduce((n, e) => n + Number(e.payload.units ?? 0), 0)
      return { today, isToday: today === realToday, dayStartHour, mood: mood[0] ?? null, sleep: sleep[0] ?? null, meditation, stretch: stretch[0] ?? null, habits: stats, lastMeditationMinutes: lastMeditation?.value ?? 10, drankYesterday: yesterdayDrinks.length > 0, unitsYesterday, morningAfter }
    },
    ['log_entries', 'habits', 'settings'],
    [day],
  )
}

export type CheckInData = NonNullable<ReturnType<typeof useCheckIn>['data']>
