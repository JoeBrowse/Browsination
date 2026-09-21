import { useMemo } from 'react'
import { useServices } from '@/app/services'
import { workRepo } from './repo'

export function useWorkRepo() {
  const s = useServices()
  return useMemo(() => workRepo(s.db), [s.db])
}
