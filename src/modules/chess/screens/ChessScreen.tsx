import { BookOpen, CalendarDays, Trophy, Users, Swords } from 'lucide-react'
import { Link } from 'react-router'
import { formatDay, calendarDay } from '@/core/time/localDay'
import { Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { timeOf, useChessRepo } from '../useChess'

const TILES = [
  { to: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { to: 'students', label: 'Students', Icon: Users },
  { to: 'repertoire', label: 'Openings', Icon: BookOpen },
  { to: 'tournaments', label: 'Events', Icon: Trophy },
  { to: 'league', label: 'League', Icon: Swords },
]

export function ChessScreen() {
  const repo = useChessRepo()
  const q = useQuery(() => {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from.getTime() + 7 * 86_400_000)
    return repo.eventsBetween(from.toISOString(), to.toISOString())
  }, ['calendar_events', 'calendars'])
  const today = calendarDay()
  return (
    <Screen title="Chess">
      <div className="tray">
        {TILES.map(({ to, label, Icon }) => (
          <Link key={to} to={to} className="tile">
            <span className="tile-icon">
              <Icon size={28} aria-hidden />
            </span>
            <span className="label">{label}</span>
          </Link>
        ))}
      </div>
      <SectionTitle>Next 7 days</SectionTitle>
      <div className="list">
        {(q.data ?? []).map((e) => {
          const day = e.start_ts.slice(0, 10)
          return (
            <div key={e.id} className="list-row" style={{ minHeight: 44 }}>
              <span className="muted small" style={{ width: 96 }}>
                {day === today ? 'Today' : formatDay(calendarDay(new Date(e.start_ts)))}
              </span>
              <span className="grow">
                {e.all_day ? '' : `${timeOf(e.start_ts)} `}
                {e.summary}
              </span>
            </div>
          )
        })}
        {q.data && q.data.length === 0 ? <div className="muted small">Nothing in the calendar</div> : null}
      </div>
    </Screen>
  )
}
