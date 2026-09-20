import { useState } from 'react'
import { Link } from 'react-router'
import { formatDay } from '@/core/time/localDay'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { MoneyInput } from '../fields'
import { pounds } from '../logic'
import type { TripRow } from '../repo'
import { useLifeRepo } from '../useLife'

export function TripsScreen() {
  const repo = useLifeRepo()
  const [adding, setAdding] = useState(false)
  const q = useQuery(() => repo.trips(), ['trips'])
  return (
    <Screen title="Trips" right={<Button onClick={() => setAdding(true)}>Add</Button>}>
      {!q.loading && (q.data?.length ?? 0) === 0 ? <EmptyState>No trips yet</EmptyState> : null}
      <div className="list">
        {(q.data ?? []).map((t) => (
          <Link key={t.id} to={t.id} className="list-row">
            <div className="grow">
              <div className="title">{t.name}</div>
              <div className="sub">
                {[t.destination || null, t.start_date ? `${formatDay(t.start_date)}${t.end_date ? ` to ${formatDay(t.end_date)}` : ''}` : null, t.budget_pence != null ? `${pounds(t.spent_pence ?? 0)} of ${pounds(t.budget_pence)}` : null, t.status === 'done' ? 'done' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <TripSheet trip={null} open={adding} onClose={() => setAdding(false)} />
    </Screen>
  )
}

export function TripSheet({ trip, open, onClose }: { trip: TripRow | null; open: boolean; onClose: () => void }) {
  const repo = useLifeRepo()
  const [d, setD] = useState({ name: trip?.name ?? '', destination: trip?.destination ?? '', start_date: trip?.start_date ?? '', end_date: trip?.end_date ?? '', budget_pence: trip?.budget_pence ?? null, status: trip?.status ?? 'planned' })
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }))
  const save = async () => {
    if (!d.name.trim()) return
    const patch = { name: d.name, destination: d.destination, start_date: d.start_date || null, end_date: d.end_date || null, budget_pence: d.budget_pence, status: d.status }
    if (trip) await repo.updateTrip(trip.id, patch)
    else await repo.addTrip(patch)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={trip ? 'Trip' : 'New trip'}>
      <div className="stack">
        <input aria-label="Trip name" placeholder="Name" value={d.name} onChange={(e) => set('name', e.target.value)} />
        <input aria-label="Destination" placeholder="Destination" value={d.destination} onChange={(e) => set('destination', e.target.value)} />
        <div className="row">
          <input type="date" aria-label="Start" value={d.start_date} onChange={(e) => set('start_date', e.target.value)} />
          <input type="date" aria-label="End" value={d.end_date} onChange={(e) => set('end_date', e.target.value)} />
        </div>
        <MoneyInput label="Budget" value={d.budget_pence} onChange={(v) => set('budget_pence', v)} placeholder="Budget £" />
        {trip ? (
          <div className="chips" role="group" aria-label="Status">
            {(['idea', 'planned', 'done'] as const).map((st) => (
              <button key={st} className={`chip${d.status === st ? ' on' : ''}`} onClick={() => set('status', st)}>
                {st}
              </button>
            ))}
          </div>
        ) : null}
        <Button variant="primary" block onClick={() => void save()} disabled={!d.name.trim()}>
          Save
        </Button>
      </div>
    </Sheet>
  )
}
