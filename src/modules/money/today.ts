import type { ModuleReminder, TodayCard, TodayContext } from '@/core/modules/types'
import { settingsRepo } from '@/core/repos/settings'
import { daysBetween, localDayOf } from '@/core/time/localDay'
import { pounds } from '@/core/ui/format'
import { checkInDue, paymentDates } from './logic'
import { moneyRepo, type AccountRow } from './repo'

interface Due {
  account: AccountRow
  due: string
  owed: number | null
}

async function cardsDue(ctx: TodayContext, leadDays: number): Promise<Due[]> {
  const repo = moneyRepo(ctx.db)
  const [accounts, latest] = await Promise.all([repo.accounts(), repo.latestBalances()])
  const out: Due[] = []
  for (const a of accounts) {
    if (a.kind !== 'credit' || !a.payment_due_day || !a.payment_reminder) continue
    const owed = latest.get(a.id)?.balance_pence ?? null
    if (owed !== null && owed <= 0) continue
    for (const p of paymentDates(ctx.calendarToday, a.payment_due_day, leadDays, leadDays)) out.push({ account: a, due: p.due, owed })
  }
  return out
}

async function checkIn(ctx: TodayContext): Promise<{ due: boolean; accounts: number }> {
  const repo = moneyRepo(ctx.db)
  const settings = settingsRepo(ctx.db)
  const [day, last, accounts] = await Promise.all([settings.get('money.checkInDay'), repo.lastCheckIn(), repo.accounts()])
  const lastDay = last ? localDayOf(last.ts, last.tz_offset_min) : null
  return { due: accounts.length > 0 && checkInDue(ctx.calendarToday, day, lastDay), accounts: accounts.length }
}

const dueLabel = (today: string, due: string): string => {
  const d = daysBetween(today, due)
  return d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`
}

export async function moneyToday(ctx: TodayContext): Promise<TodayCard[]> {
  const settings = settingsRepo(ctx.db)
  const leadDays = await settings.get('money.paymentLeadDays')
  const cards: TodayCard[] = []
  const ci = await checkIn(ctx)
  if (ci.due) cards.push({ key: 'money:checkin', module: 'money', kind: 'checkin', title: 'Money check-in', sub: `${ci.accounts} accounts`, priority: 4, href: '/m/money/checkin' })
  for (const d of await cardsDue(ctx, leadDays)) {
    cards.push({ key: `money:pay:${d.account.id}:${d.due}`, module: 'money', kind: 'due', title: `${d.account.name} payment ${dueLabel(ctx.calendarToday, d.due)}`, sub: d.owed !== null ? `${pounds(d.owed)} owed` : undefined, priority: 1, href: '/m/money/credit' })
  }
  return cards
}

export async function moneyDigest(ctx: TodayContext): Promise<string[]> {
  const settings = settingsRepo(ctx.db)
  const [digest, leadDays] = await Promise.all([settings.get('money.checkInDigest'), settings.get('money.paymentLeadDays')])
  const lines: string[] = []
  if (digest && (await checkIn(ctx)).due) lines.push('Money check-in due')
  for (const d of await cardsDue(ctx, leadDays)) lines.push(`${d.account.name} payment ${dueLabel(ctx.calendarToday, d.due)}`)
  return lines
}

/** One timed reminder per card per due date, `paymentLeadDays` before, at the money reminder time. */
export async function moneyReminders(ctx: TodayContext): Promise<ModuleReminder[]> {
  const settings = settingsRepo(ctx.db)
  if (!(await settings.get('money.paymentReminders'))) return []
  const [leadDays, time] = await Promise.all([settings.get('money.paymentLeadDays'), settings.get('money.reminderTime')])
  const repo = moneyRepo(ctx.db)
  const [accounts, latest] = await Promise.all([repo.accounts(), repo.latestBalances()])
  const out: ModuleReminder[] = []
  for (const a of accounts) {
    if (a.kind !== 'credit' || !a.payment_due_day || !a.payment_reminder) continue
    const owed = latest.get(a.id)?.balance_pence ?? null
    if (owed !== null && owed <= 0) continue
    for (const p of paymentDates(ctx.calendarToday, a.payment_due_day, leadDays, 14)) {
      out.push({ key: `card:${a.id}:${p.due}`, at: `${p.remindOn}T${time}`, title: `${a.name} payment due ${dueLabel(p.remindOn, p.due)}`, body: owed !== null ? `${pounds(owed)} owed` : undefined, route: '/m/money/credit' })
    }
  }
  return out
}
