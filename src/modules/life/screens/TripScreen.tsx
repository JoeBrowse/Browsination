import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useComplete } from '@/app/tasks/useComplete'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { GoalPicker } from '@/core/ui/GoalPicker'
import { Button, Card, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { MoneyInput } from '../fields'
import { pounds, sparklinePath } from '../logic'
import { useLifeRepo } from '../useLife'
import { TripSheet } from './TripsScreen'

export function TripScreen() {
  const { id = '' } = useParams()
  const repo = useLifeRepo()
  const navigate = useNavigate()
  const complete = useComplete()
  const [editing, setEditing] = useState(false)
  const [check, setCheck] = useState('')
  const [ref, setRef] = useState({ label: '', ref: '' })
  const [price, setPrice] = useState({ checked_on: calendarDay(), route: '', price_pence: null as number | null, url: '' })
  const q = useQuery(async () => {
    const trip = await repo.trip(id)
    if (!trip) return null
    return { trip, checklist: await repo.checklist(id), prices: await repo.flightPrices(id) }
  }, ['trips', 'items', 'flight_prices'], [id])
  const d = q.data
  if (!d) return <Screen title="Trip">{q.loading ? null : <div className="empty">Not found</div>}</Screen>
  const { trip } = d
  const refs = repo.bookingRefs(trip)
  const open = d.checklist.filter((i) => i.status !== 'done' && i.status !== 'dropped')
  const values = d.prices.map((p) => p.price_pence)
  return (
    <Screen title={trip.name} right={<Button onClick={() => setEditing(true)}>Edit</Button>}>
      <Card>
        <div className="kv">
          <span className="muted">When</span>
          <span>{trip.start_date ? `${formatDay(trip.start_date)}${trip.end_date ? ` to ${formatDay(trip.end_date)}` : ''}` : '–'}</span>
        </div>
        <div className="kv">
          <span className="muted">Where</span>
          <span>{trip.destination || '–'}</span>
        </div>
        <div className="kv">
          <span className="muted">Budget</span>
          <span>{pounds(trip.budget_pence) || '–'}</span>
        </div>
        <div className="row">
          <span className="grow muted">Goal</span>
          <GoalPicker value={trip.goal_id} onChange={(goal_id) => void repo.updateTrip(trip.id, { goal_id })} />
        </div>
        <div className="row">
          <span className="grow muted">Spent</span>
          <div style={{ width: 140 }}>
            <MoneyInput label="Spent" value={trip.spent_pence} onChange={(v) => void repo.updateTrip(trip.id, { spent_pence: v })} placeholder="£" />
          </div>
        </div>
        {trip.budget_pence != null && trip.spent_pence != null ? <div className="muted small">{pounds(trip.budget_pence - trip.spent_pence)} left</div> : null}
      </Card>

      <SectionTitle>Checklist · {open.length} left</SectionTitle>
      <div className="list">
        {d.checklist.map((i) => (
          <div key={i.id} className="list-row">
            <button className={`check${i.status === 'done' ? ' on' : ''}`} aria-label={`Done: ${i.title}`} onClick={() => (i.status === 'done' ? void repo.items.setStatus(i.id, 'todo') : void complete(i))} />
            <div className="grow" style={{ textDecoration: i.status === 'done' ? 'line-through' : 'none' }}>
              {i.title}
            </div>
          </div>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!check.trim()) return
          void repo.addChecklistItem(trip.id, check)
          setCheck('')
        }}
      >
        <input aria-label="New checklist item" placeholder="Add" value={check} onChange={(e) => setCheck(e.target.value)} />
        <Button type="submit" disabled={!check.trim()}>
          Add
        </Button>
      </form>

      <SectionTitle>Bookings</SectionTitle>
      <div className="list">
        {refs.map((r, i) => (
          <div key={i} className="list-row" style={{ minHeight: 44 }}>
            <span className="grow">{r.label}</span>
            <span className="muted">{r.ref}</span>
            <Button ariaLabel={`Remove booking ${r.label}`} onClick={() => void repo.updateTrip(trip.id, { booking_refs: JSON.stringify(refs.filter((_, j) => j !== i)) })}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ref.label.trim()) return
          void repo.updateTrip(trip.id, { booking_refs: JSON.stringify([...refs, { label: ref.label.trim(), ref: ref.ref.trim() }]) })
          setRef({ label: '', ref: '' })
        }}
      >
        <input aria-label="Booking label" placeholder="Hotel" value={ref.label} onChange={(e) => setRef({ ...ref, label: e.target.value })} />
        <input aria-label="Booking reference" placeholder="Reference" value={ref.ref} onChange={(e) => setRef({ ...ref, ref: e.target.value })} />
        <Button type="submit" disabled={!ref.label.trim()}>
          Add
        </Button>
      </form>

      <SectionTitle>Flight prices</SectionTitle>
      {values.length > 1 ? (
        <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none" role="img" aria-label="Flight price trend">
          <path d={sparklinePath(values, 200, 48)} fill="none" stroke="var(--accent)" strokeWidth="2" />
        </svg>
      ) : null}
      <div className="list">
        {d.prices.map((p) => (
          <div key={p.id} className="list-row" style={{ minHeight: 44 }}>
            <span className="grow small">
              {formatDay(p.checked_on)} · {p.route}
            </span>
            {p.url ? (
              <a href={p.url} target="_blank" rel="noreferrer" className="small">
                link
              </a>
            ) : null}
            <span>{pounds(p.price_pence)}</span>
            <Button ariaLabel="Remove price" onClick={() => void repo.removeFlightPrice(p.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <form
        className="stack"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!price.route.trim() || price.price_pence === null) return
          void repo.addFlightPrice({ trip_id: trip.id, checked_on: price.checked_on, route: price.route.trim(), price_pence: price.price_pence, url: price.url.trim() || null })
          setPrice({ ...price, price_pence: null, url: '' })
        }}
      >
        <div className="row">
          <input type="date" aria-label="Checked on" value={price.checked_on} onChange={(e) => setPrice({ ...price, checked_on: e.target.value })} />
          <input aria-label="Route" placeholder="BRS-LIS" value={price.route} onChange={(e) => setPrice({ ...price, route: e.target.value })} />
        </div>
        <div className="row">
          <MoneyInput label="Price" value={price.price_pence} onChange={(v) => setPrice({ ...price, price_pence: v })} placeholder="Price £" />
          <input aria-label="Price link" placeholder="Link" value={price.url} onChange={(e) => setPrice({ ...price, url: e.target.value })} inputMode="url" />
          <Button type="submit" disabled={!price.route.trim() || price.price_pence === null}>
            Log
          </Button>
        </div>
      </form>
      <div style={{ marginTop: 24 }}>
        <Button
          variant="danger"
          onClick={() => {
            void repo.removeTrip(trip.id)
            navigate('/m/life/trips')
          }}
        >
          Delete trip
        </Button>
      </div>
      <TripSheet key={editing ? 'open' : 'closed'} trip={trip} open={editing} onClose={() => setEditing(false)} />
    </Screen>
  )
}
