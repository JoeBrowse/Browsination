import { daysBetween, type LocalDay } from '@/core/time/localDay'
import type { KeyDate, ProgressionRow, ProjectRow } from './repo'

export interface Upcoming {
  key: string
  title: string
  sub?: string
  date: LocalDay
  daysUntil: number
  href: string
}

const inWindow = (today: LocalDay, date: LocalDay, within: number) => {
  const d = daysBetween(today, date)
  return d >= 0 && d <= within ? d : null
}

/** Project key dates inside the window, soonest first. Done projects are skipped. */
export function upcomingKeyDates(projects: { project: Pick<ProjectRow, 'id' | 'name' | 'status'>; dates: KeyDate[] }[], today: LocalDay, within: number): Upcoming[] {
  const out: Upcoming[] = []
  for (const { project, dates } of projects) {
    if (project.status === 'done') continue
    for (const k of dates) {
      const d = inWindow(today, k.date, within)
      if (d === null) continue
      out.push({ key: `date:${project.id}:${k.date}:${k.label}`, title: `${project.name}: ${k.label}`, sub: d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`, date: k.date, daysUntil: d, href: `/m/work/projects/${project.id}` })
    }
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil)
}

/** Active milestones with a target date inside the window. */
export function upcomingMilestones(items: Pick<ProgressionRow, 'id' | 'kind' | 'title' | 'status' | 'target_date'>[], today: LocalDay, within: number): Upcoming[] {
  const out: Upcoming[] = []
  for (const m of items) {
    if (m.kind !== 'milestone' || m.status !== 'active' || !m.target_date) continue
    const d = inWindow(today, m.target_date, within)
    if (d === null) continue
    out.push({ key: `milestone:${m.id}`, title: m.title, sub: d === 0 ? 'today' : `in ${d} days`, date: m.target_date, daysUntil: d, href: '/m/work/progression' })
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil)
}

/** Plain text of the evidence log for an appraisal, newest first, one line per entry. */
export function evidenceText(rows: { day: LocalDay; kind: string; title: string; detail: string; source: string }[]): string {
  return rows.map((e) => `${e.day} ${e.kind === 'feedback' ? 'Feedback' : 'Achievement'}: ${e.title}${e.source ? ` (${e.source})` : ''}${e.detail ? ` – ${e.detail}` : ''}`).join('\n')
}
