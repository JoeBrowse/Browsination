import type { ItemRow } from '@/core/repos/items'
import { weekday } from '@/core/recurrence/rrule'
import { addDays, calendarDay, formatDay, type LocalDay } from '@/core/time/localDay'
import { EmptyState, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../services'

interface DayGroup {
  day: LocalDay
  items: ItemRow[]
}
interface WeekGroup {
  monday: LocalDay
  days: DayGroup[]
}

/** Completed items grouped by day inside week headers. Newest first. */
export function groupWins(items: ItemRow[]): WeekGroup[] {
  const byDay = new Map<LocalDay, ItemRow[]>()
  for (const i of items) {
    if (!i.completed_at) continue
    const day = calendarDay(new Date(i.completed_at))
    byDay.set(day, [...(byDay.get(day) ?? []), i])
  }
  const weeks = new Map<LocalDay, DayGroup[]>()
  for (const [day, list] of [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
    const monday = addDays(day, -weekday(day))
    weeks.set(monday, [...(weeks.get(monday) ?? []), { day, items: list }])
  }
  return [...weeks.entries()].map(([monday, days]) => ({ monday, days }))
}

export function WinsList({ onOpen }: { onOpen: (item: ItemRow) => void }) {
  const s = useServices()
  const q = useQuery(() => s.tasks.recentDone(), ['items'])
  const weeks = groupWins(q.data ?? [])
  if (!q.loading && weeks.length === 0) return <EmptyState>No wins yet</EmptyState>
  return (
    <div>
      {weeks.map((w) => (
        <div key={w.monday}>
          <SectionTitle>
            Week of {formatDay(w.monday)} · {w.days.reduce((n, d) => n + d.items.length, 0)}
          </SectionTitle>
          {w.days.map((d) => (
            <div key={d.day} className="list">
              <div className="muted small" style={{ marginTop: 6 }}>
                {formatDay(d.day)}
              </div>
              {d.items.map((i) => (
                <button key={i.id} className="list-row" onClick={() => onOpen(i)}>
                  <div className="grow">
                    <div className="title">{i.title}</div>
                    {i.module ? <div className="sub">{i.module}</div> : null}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
