import type { WeekContext, WeekItem } from '@/core/modules/types'
import { addDays, localDayOf, tzOffsetMin } from '@/core/time/localDay'
import { chessRepo } from './repo'

/** Calendar events, tournaments (starts and entry deadlines) and league fixtures inside the range. */
export async function chessWeek(ctx: WeekContext): Promise<WeekItem[]> {
  const repo = chessRepo(ctx.db)
  const out: WeekItem[] = []
  const fromTs = new Date(`${ctx.from}T00:00:00`).toISOString()
  const toTs = new Date(`${addDays(ctx.to, 1)}T00:00:00`).toISOString()
  for (const e of await repo.eventsBetween(fromTs, toTs)) {
    const start = new Date(e.start_ts)
    out.push({ key: `event:${e.id}`, date: localDayOf(e.start_ts, tzOffsetMin(start)), title: e.summary, sub: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), href: '/m/chess' })
  }
  for (const t of await repo.tournaments()) {
    if (t.start_date && t.start_date >= ctx.from && t.start_date <= ctx.to && t.entered !== 'skipped') out.push({ key: `tournament:${t.id}`, date: t.start_date, title: t.name, sub: t.entered === 'yes' ? 'tournament' : 'tournament, not entered', href: '/m/chess/tournaments' })
    if (t.entry_deadline && t.entered === 'no' && t.entry_deadline >= ctx.from && t.entry_deadline <= ctx.to) out.push({ key: `deadline:${t.id}`, date: t.entry_deadline, title: `${t.name} entry deadline`, href: '/m/chess/tournaments' })
  }
  for (const f of await repo.league.fixturesBetween(ctx.from, ctx.to)) out.push({ key: `fixture:${f.id}`, date: f.date, title: `Chess v ${f.opponent_team || f.opponent || 'TBC'}`, sub: f.colour ? `${f.colour}${f.board ? `, board ${f.board}` : ''}` : undefined, href: '/m/chess/league' })
  return out
}
