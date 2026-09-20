import { CalendarHeart, FileBadge, ListChecks, Plane, Users } from 'lucide-react'
import { Link } from 'react-router'
import { formatDay, calendarDay } from '@/core/time/localDay'
import { Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useLifeRepo } from '../useLife'

const TILES = [
  { to: 'lists', label: 'Lists', Icon: ListChecks },
  { to: 'people', label: 'People', Icon: Users },
  { to: 'dates', label: 'Dates', Icon: CalendarHeart },
  { to: 'trips', label: 'Trips', Icon: Plane },
  { to: 'admin', label: 'Admin', Icon: FileBadge },
]

export function LifeScreen() {
  const repo = useLifeRepo()
  const q = useQuery(
    async () => {
      const today = calendarDay()
      const [next, trips] = await Promise.all([repo.nextPlannedDate(today), repo.upcomingTrips(today, 365)])
      return { next, trip: trips[0] ?? null }
    },
    ['date_nights', 'trips'],
  )
  return (
    <Screen title="Life">
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
      <div className="stack" style={{ marginTop: 16 }}>
        <div className="kv">
          <span className="muted">Next date</span>
          <span>{q.data?.next ? `${formatDay(q.data.next.date!)} · ${q.data.next.title}` : '–'}</span>
        </div>
        <div className="kv">
          <span className="muted">Next trip</span>
          <span>{q.data?.trip ? `${formatDay(q.data.trip.start_date!)} · ${q.data.trip.name}` : '–'}</span>
        </div>
      </div>
    </Screen>
  )
}
