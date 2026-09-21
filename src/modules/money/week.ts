import type { WeekContext, WeekItem } from '@/core/modules/types'
import { settingsRepo } from '@/core/repos/settings'
import { nextDueDate } from './logic'
import { moneyRepo } from './repo'
import { money } from './useMoney'

/** Card payment dates and the monthly check-in day inside the range. */
export async function moneyWeek(ctx: WeekContext): Promise<WeekItem[]> {
  const repo = moneyRepo(ctx.db)
  const out: WeekItem[] = []
  const latest = await repo.latestBalances()
  for (const a of await repo.accounts()) {
    if (a.kind !== 'credit' || !a.payment_due_day) continue
    const owed = latest.get(a.id)?.balance_pence ?? null
    if (owed !== null && owed <= 0) continue
    const due = nextDueDate(ctx.from, a.payment_due_day)
    if (due <= ctx.to) out.push({ key: `card:${a.id}:${due}`, date: due, title: `${a.name} payment`, sub: owed !== null ? `${money(owed)} owed` : undefined, href: '/m/money/credit' })
  }
  const day = await settingsRepo(ctx.db).get('money.checkInDay')
  const checkIn = nextDueDate(ctx.from, day)
  if (checkIn <= ctx.to) out.push({ key: `checkin:${checkIn}`, date: checkIn, title: 'Money check-in', href: '/m/money/checkin' })
  return out
}
