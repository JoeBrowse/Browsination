import { useMemo } from 'react'
import { useServices } from '@/app/services'
import { calendarDay } from '@/core/time/localDay'
import { useQuery } from '@/core/ui/useQuery'
import { netWorthSeries } from './logic'
import { moneyRepo } from './repo'

export function useMoneyRepo() {
  const s = useServices()
  return useMemo(() => moneyRepo(s.db), [s.db])
}

/** Accounts with their latest balances and the net worth series, the basis of most money screens. */
export function useAccounts(includeArchived = false) {
  const repo = useMoneyRepo()
  return useQuery(
    async () => {
      const [accounts, latest, snapshots] = await Promise.all([repo.accounts(includeArchived), repo.latestBalances(), repo.allSnapshots()])
      return { accounts, latest, series: netWorthSeries(accounts, snapshots), today: calendarDay() }
    },
    ['accounts', 'balance_snapshots'],
    [includeArchived],
  )
}

export const signed = (pence: number): string => `${pence < 0 ? '−' : pence > 0 ? '+' : ''}£${Math.abs(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
export const money = (pence: number | null | undefined): string => (pence === null || pence === undefined ? '–' : `${pence < 0 ? '−' : ''}£${Math.abs(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
export const moneyShort = (pence: number | null | undefined): string => (pence === null || pence === undefined ? '–' : `${pence < 0 ? '−' : ''}£${Math.abs(pence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`)
