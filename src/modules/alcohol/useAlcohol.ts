import { useMemo } from 'react'
import { useServices } from '@/app/services'
import { useQuery } from '@/core/ui/useQuery'
import { logDayRange, todayLocal, lastNDays } from '@/core/time/localDay'
import { clearAt, dayStatus, weekSummary } from './coffee'
import type { ModelParams, Person } from './model'
import { alcoholRepo } from './repo'

export function useAlcoholRepo() {
  const s = useServices()
  return useMemo(() => alcoholRepo(s.db), [s.db])
}

export interface AlcoholSettings {
  person: Person
  params: ModelParams
  usualBedtime: string
  usualSleepHours: number
  caffeineHalfLifeHours: number
  perDay: number
  latestTime: string
  usualCup: { preset: string; name: string; mg: number }
}

export function useAlcoholSettings() {
  const s = useServices()
  return useQuery(async (): Promise<AlcoholSettings> => {
    const v = await s.settings.all()
    return {
      person: { weightKg: v['alcohol.weightKg'], sex: v['alcohol.sex'] },
      params: { eliminationRate: v['alcohol.eliminationRate'], absorptionHalfLifeMin: v['alcohol.absorptionHalfLifeMin'] },
      usualBedtime: v['alcohol.usualBedtime'],
      usualSleepHours: v['alcohol.usualSleepHours'],
      caffeineHalfLifeHours: v['caffeine.halfLifeHours'],
      perDay: v['caffeine.perDay'],
      latestTime: v['caffeine.latestTime'],
      usualCup: v['caffeine.usual'],
    }
  }, ['settings'])
}

/** Today's cups against the target, when it clears, and the last seven days. */
export function useCoffee() {
  const s = useServices()
  const repo = useAlcoholRepo()
  return useQuery(async () => {
    const v = await s.settings.all()
    const dayStartHour = v.dayStartHour
    const now = new Date()
    const today = todayLocal(now, dayStartHour)
    const r = logDayRange(today, dayStartHour)
    const [todayCups, week] = await Promise.all([repo.caffeineBetween(r.from, r.to), repo.caffeineBetween(new Date(now.getTime() - 8 * 86_400_000).toISOString(), r.to)])
    const doses = todayCups.map((c) => ({ atMs: Date.parse(c.ts), mg: c.value ?? 0 }))
    return {
      today: dayStatus(todayCups, v['caffeine.perDay'], v['caffeine.latestTime']),
      week: weekSummary(week, lastNDays(today, 7), v['caffeine.perDay'], dayStartHour),
      clearAtMs: clearAt(doses, now.getTime(), v['caffeine.halfLifeHours']),
      usual: v['caffeine.usual'],
      latestTime: v['caffeine.latestTime'],
      doses,
    }
  }, ['log_entries', 'settings'])
}

/** Rolling seven days ending now. */
export function weekAgoIso(now = new Date()): string {
  return new Date(now.getTime() - 7 * 86_400_000).toISOString()
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
