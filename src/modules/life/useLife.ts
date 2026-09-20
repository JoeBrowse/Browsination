import { useMemo } from 'react'
import { useServices } from '@/app/services'
import { lifeRepo } from './repo'

export function useLifeRepo() {
  const s = useServices()
  return useMemo(() => lifeRepo(s.db), [s.db])
}
