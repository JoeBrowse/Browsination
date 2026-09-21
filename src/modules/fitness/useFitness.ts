import { useMemo } from 'react'
import { useServices } from '@/app/services'
import { useQuery } from '@/core/ui/useQuery'
import { RECOVERY_PACES } from './data/recovery'
import { fitnessRepo, type WeightUnit } from './repo'

export function useFitnessRepo() {
  const s = useServices()
  return useMemo(() => fitnessRepo(s.db), [s.db])
}

export interface FitnessSettings {
  unit: WeightUnit
  restCompound: number
  restIsolation: number
  startingSets: number
  paceFactor: number
  weightGoal: number | null
  nudgeDays: number
}

export function useFitnessSettings() {
  const s = useServices()
  return useQuery(async (): Promise<FitnessSettings> => {
    const v = await s.settings.all()
    return { unit: v['fitness.weightUnit'], restCompound: v['fitness.restCompound'], restIsolation: v['fitness.restIsolation'], startingSets: v['fitness.startingSets'], paceFactor: RECOVERY_PACES.find((p) => p.value === v['fitness.recoveryPace'])?.factor ?? 1, weightGoal: v['fitness.weightGoal'], nudgeDays: v['fitness.nudgeDays'] }
  }, ['settings'])
}

export const fmtWeight = (w: number | null | undefined, unit: WeightUnit): string => (w === null || w === undefined ? '–' : `${Math.round(w * 10) / 10} ${unit}`)
export const fmtSet = (s: { weight: number | null; reps: number | null }, unit: WeightUnit): string => (s.weight === null ? `${s.reps ?? '–'} reps` : `${Math.round(s.weight * 10) / 10}${unit === 'kg' ? '' : 'lb'}×${s.reps ?? '–'}`)
export const agoLabel = (ms: number, now = Date.now()): string => {
  const h = (now - ms) / 3_600_000
  if (h < 1) return 'just now'
  if (h < 24) return `${Math.round(h)}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}
