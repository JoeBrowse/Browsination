import type { TodayCard, TodayContext } from '@/core/modules/types'
import { daysBetween } from '@/core/time/localDay'
import { dayRange } from '@/core/tasks/queries'
import { dueForReview, tournamentNudges } from './logic'
import { chessRepo } from './repo'
import { timeOf } from './useChess'

export async function chessToday(ctx: TodayContext): Promise<TodayCard[]> {
  const repo = chessRepo(ctx.db)
  const cards: TodayCard[] = []
  const r = dayRange(ctx.calendarToday)
  for (const e of await repo.eventsBetween(r.from, r.to)) {
    cards.push({ key: `chess:event:${e.id}`, module: 'chess', kind: 'event', title: e.all_day ? e.summary : `${timeOf(e.start_ts)} ${e.summary}`, sub: e.location || undefined, priority: 1, href: '/m/chess/calendar' })
  }
  for (const f of await repo.league.fixturesOn(ctx.calendarToday)) {
    const vs = f.opponent_team || f.opponent
    cards.push({ key: `chess:fixture:${f.id}`, module: 'chess', kind: 'event', title: `${f.start_time ? `${f.start_time} ` : ''}League${vs ? ` ${f.home ? 'v' : 'at'} ${vs}` : ''}`, sub: [f.venue || null, f.board ? `board ${f.board}` : null, f.colour, f.opponent_team ? f.opponent || null : null].filter(Boolean).join(' · ') || undefined, priority: 1, href: '/m/chess/league' })
  }
  const next = await repo.league.nextFixture(ctx.calendarToday)
  if (next && next.date !== ctx.calendarToday) {
    const d = daysBetween(ctx.calendarToday, next.date)
    if (d <= 7) cards.push({ key: `chess:next-fixture`, module: 'chess', kind: 'nudge', title: `League in ${d} ${d === 1 ? 'day' : 'days'}${next.opponent_team ? ` ${next.home ? 'v' : 'at'} ${next.opponent_team}` : ''}`, sub: next.home ? undefined : next.venue || undefined, priority: 3, href: '/m/chess/league' })
  }
  for (const n of tournamentNudges(await repo.tournaments(), ctx.calendarToday)) {
    cards.push({ key: `chess:tournament:${n.id}`, module: 'chess', kind: 'nudge', title: n.title, sub: n.sub, priority: n.priority, href: '/m/chess/tournaments' })
  }
  const due = dueForReview(await repo.repertoire(), ctx.calendarToday)
  if (due.length) cards.push({ key: 'chess:review', module: 'chess', kind: 'nudge', title: `${due.length} ${due.length === 1 ? 'line' : 'lines'} due for review`, priority: 4, href: '/m/chess/repertoire' })
  return cards
}

export async function chessDigest(ctx: TodayContext): Promise<string[]> {
  const repo = chessRepo(ctx.db)
  const out: string[] = []
  const r = dayRange(ctx.calendarToday)
  const events = await repo.eventsBetween(r.from, r.to)
  if (events.length) out.push(`${events.length} ${events.length === 1 ? 'lesson' : 'lessons'} today`)
  for (const n of tournamentNudges(await repo.tournaments(), ctx.calendarToday).slice(0, 2)) out.push(`${n.title} ${n.sub}`)
  return out
}
