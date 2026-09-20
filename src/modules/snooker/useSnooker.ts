import { useMemo } from 'react'
import { useServices } from '@/app/services'
import { snookerRepo } from './repo'

export function useSnookerRepo() {
  const s = useServices()
  return useMemo(() => snookerRepo(s.db), [s.db])
}
