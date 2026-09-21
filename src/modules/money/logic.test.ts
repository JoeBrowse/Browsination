import { describe, expect, it } from 'vitest'
import { checkInDue, goalProgress, holdingValue, monthChange, monthlyPoints, netWorthSeries, nextDueDate, paymentDates, utilisation, valueOn } from './logic'

const accounts = [
  { id: 'a', kind: 'current' as const, archived: 0 },
  { id: 'b', kind: 'credit' as const, archived: 0 },
  { id: 'c', kind: 'savings' as const, archived: 1 },
]

describe('net worth', () => {
  it('sums the latest balance per account, subtracting cards and ignoring archived accounts', () => {
    const series = netWorthSeries(accounts, [
      { account_id: 'a', day: '2026-08-01', balance_pence: 1000 },
      { account_id: 'c', day: '2026-08-01', balance_pence: 99999 },
      { account_id: 'b', day: '2026-08-15', balance_pence: 300 },
      { account_id: 'a', day: '2026-09-01', balance_pence: 1500 },
      { account_id: 'b', day: '2026-09-01', balance_pence: 0 },
    ])
    expect(series).toEqual([
      { day: '2026-08-01', pence: 1000 },
      { day: '2026-08-15', pence: 700 },
      { day: '2026-09-01', pence: 1500 },
    ])
    expect(valueOn(series, '2026-08-20')).toBe(700)
    expect(valueOn(series, '2026-07-01')).toBeNull()
    expect(monthlyPoints(series).map((p) => p.day)).toEqual(['2026-08-15', '2026-09-01'])
    expect(monthChange(series, '2026-09-10')).toBe(1500 - 1000)
  })
  it('is empty without balances', () => {
    expect(netWorthSeries(accounts, [])).toEqual([])
    expect(monthChange([], '2026-09-10')).toBeNull()
  })
})

describe('credit', () => {
  it('utilisation needs a limit', () => {
    expect(utilisation(500, 2000)).toBe(0.25)
    expect(utilisation(-50, 2000)).toBe(0)
    expect(utilisation(500, null)).toBeNull()
    expect(utilisation(null, 2000)).toBeNull()
  })
  it('next due date rolls over and clamps to short months', () => {
    expect(nextDueDate('2026-09-10', 14)).toBe('2026-09-14')
    expect(nextDueDate('2026-09-14', 14)).toBe('2026-09-14')
    expect(nextDueDate('2026-09-15', 14)).toBe('2026-10-14')
    expect(nextDueDate('2026-12-20', 14)).toBe('2027-01-14')
    expect(nextDueDate('2026-02-01', 31)).toBe('2026-02-28')
  })
  it('payment reminders fall lead days before each due date in the window', () => {
    expect(paymentDates('2026-09-10', 14, 3)).toEqual([{ due: '2026-09-14', remindOn: '2026-09-11' }])
    expect(paymentDates('2026-09-13', 14, 3)).toEqual([{ due: '2026-09-14', remindOn: '2026-09-13' }])
    expect(paymentDates('2026-09-15', 14, 3)).toEqual([])
    expect(paymentDates('2026-09-01', 14, 3, 60).map((p) => p.due)).toEqual(['2026-09-14', '2026-10-14'])
  })
})

describe('goals and holdings', () => {
  it('progress from a linked account or the manual figure, with the monthly amount needed', () => {
    const linked = goalProgress({ target_pence: 100000, saved_pence: 0, account_id: 'x', deadline: '2027-01-01' }, 40000, '2026-09-01')
    expect(linked.saved).toBe(40000)
    expect(linked.remaining).toBe(60000)
    expect(linked.monthsLeft).toBe(5)
    expect(linked.monthly).toBe(12000)
    const manual = goalProgress({ target_pence: 100000, saved_pence: 100000, account_id: null, deadline: null }, null, '2026-09-01')
    expect(manual.fraction).toBe(1)
    expect(manual.monthly).toBeNull()
    expect(goalProgress({ target_pence: 1000, saved_pence: 0, account_id: null, deadline: '2026-09-02' }, null, '2026-09-01').monthsLeft).toBe(1)
  })
  it('holding value and gain from a manual price', () => {
    expect(holdingValue({ quantity: 10, cost_pence: 1000, price_pence: 150 })).toEqual({ value: 1500, gain: 500, gainPct: 0.5 })
    expect(holdingValue({ quantity: 10, cost_pence: 1000, price_pence: null }).value).toBeNull()
    expect(holdingValue({ quantity: 10, cost_pence: 0, price_pence: 100 }).gainPct).toBeNull()
  })
})

describe('check-in', () => {
  it('is due from the check-in day until logged that month', () => {
    expect(checkInDue('2026-09-01', 1, null)).toBe(true)
    expect(checkInDue('2026-09-01', 5, null)).toBe(false)
    expect(checkInDue('2026-09-05', 5, '2026-08-05')).toBe(true)
    expect(checkInDue('2026-09-05', 5, '2026-09-05')).toBe(false)
    expect(checkInDue('2026-02-28', 31, null)).toBe(true)
  })
})
