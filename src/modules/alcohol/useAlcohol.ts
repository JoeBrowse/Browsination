import { useMemo } from 'react'
import { useServices } from '@/app/services'
import { useQuery } from '@/core/ui/useQuery'
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
    }
  }, ['settings'])
}

/** Rolling seven days ending now. */
export function weekAgoIso(now = new Date()): string {
  return new Date(now.getTime() - 7 * 86_400_000).toISOString()
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
