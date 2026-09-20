import { useMemo } from 'react'
import { useServices } from '@/app/services'
import { consistency, daysWith, type Consistency } from '@/core/consistency/consistency'
import { addDays, todayLocal } from '@/core/time/localDay'
import { useQuery } from '@/core/ui/useQuery'
import { banjoRepo } from './repo'

export function useBanjoRepo() {
  const s = useServices()
  return useMemo(() => banjoRepo(s.db), [s.db])
}

/** Practice consistency over the last 7 and 28 days plus this week's minutes. */
export function usePracticeStats() {
  const s = useServices()
  const repo = useBanjoRepo()
  return useQuery(
    async () => {
      const dayStartHour = await s.settings.get('dayStartHour')
      const today = todayLocal(new Date(), dayStartHour)
      const since = new Date(Date.parse(`${addDays(today, -30)}T00:00:00Z`)).toISOString()
      const days = daysWith(await repo.practiceStamps(since), dayStartHour)
      const week: Consistency = consistency(days, today, 7)
      const month: Consistency = consistency(days, today, 28)
      const weekStart = new Date(Date.parse(`${addDays(today, -6)}T00:00:00Z`)).toISOString()
      return { today, dayStartHour, week, month, minutesThisWeek: await repo.minutesSince(weekStart), last: (await repo.sessions(1))[0] ?? null }
    },
    ['log_entries', 'settings'],
  )
}
