import { useMemo } from 'react'
import { useServices } from '@/app/services'
import { chessRepo } from './repo'

export function useChessRepo() {
  const s = useServices()
  return useMemo(() => chessRepo(s.db), [s.db])
}

export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
