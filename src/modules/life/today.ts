import type { TodayCard, TodayContext } from '@/core/modules/types'
import { settingsRepo } from '@/core/repos/settings'
import { addDays, daysBetween, formatDay } from '@/core/time/localDay'
import { adminNudges, birthdayNudges, keepInTouchNudges, type Nudge } from './logic'
import { lifeRepo } from './repo'

async function nudges(ctx: TodayContext): Promise<{ cards: Nudge[]; actions: Map<string, () => Promise<void>> }> {
  const repo = lifeRepo(ctx.db)
  const settings = settingsRepo(ctx.db)
  const [people, admin, leadDays, kit, adminLead, nudgeWeeks] = await Promise.all([
    repo.people.list(),
    repo.admin(),
    settings.get('life.birthdayLeadDays'),
    settings.get('life.keepInTouch'),
    settings.get('life.adminLeadDays'),
    settings.get('life.dateNightNudgeWeeks'),
  ])
  const cards: Nudge[] = [...birthdayNudges(people, ctx.calendarToday, leadDays), ...adminNudges(admin, ctx.calendarToday, adminLead)]
  const actions = new Map<string, () => Promise<void>>()
  if (kit) {
    for (const n of keepInTouchNudges(people, ctx.now)) {
      cards.push(n)
      actions.set(n.key, () => repo.contacted(n.key.slice(4)))
    }
  }
  if (nudgeWeeks > 0) {
    const next = await repo.nextPlannedDate(ctx.calendarToday)
    if (!next || daysBetween(ctx.calendarToday, next.date!) > nudgeWeeks * 7) cards.push({ key: 'date-night', title: 'Plan a date night', sub: next ? `next ${formatDay(next.date!)}` : 'nothing planned', priority: 5, href: '/m/life/dates' })
  }
  for (const t of await repo.upcomingTrips(ctx.calendarToday, 7)) {
    const open = (await repo.checklist(t.id)).filter((i) => i.status !== 'done' && i.status !== 'dropped').length
    const d = daysBetween(ctx.calendarToday, t.start_date!)
    cards.push({ key: `trip:${t.id}`, title: d === 0 ? `${t.name} today` : `${t.name} in ${d} days`, sub: open ? `${open} on the checklist` : undefined, priority: 1, href: `/m/life/trips/${t.id}` })
  }
  return { cards, actions }
}

export async function lifeToday(ctx: TodayContext): Promise<TodayCard[]> {
  const { cards, actions } = await nudges(ctx)
  return cards.map((n) => {
    const run = actions.get(n.key)
    return { key: `life:${n.key}`, module: 'life', kind: n.key.startsWith('bday') || n.key.startsWith('trip') ? 'event' : 'nudge', title: n.title, sub: n.sub, priority: n.priority, href: n.href, action: run ? { label: 'Contacted', run } : undefined }
  })
}

/** Morning digest lines: birthdays, admin due, trips. At most three. */
export async function lifeDigest(ctx: TodayContext): Promise<string[]> {
  const { cards } = await nudges(ctx)
  return cards
    .filter((n) => !n.key.startsWith('kit') && n.key !== 'date-night')
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map((n) => n.title)
}

export { addDays }
