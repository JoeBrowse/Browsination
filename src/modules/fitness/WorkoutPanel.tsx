import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from '@/app/shellStore'
import { consistency } from '@/core/consistency/consistency'
import { localDayOf, todayLocal } from '@/core/time/localDay'
import { Button, SectionTitle } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { agoLabel, useFitnessRepo, useFitnessSettings } from './useFitness'
import { StartSheet } from './workout/StartSheet'

/** Today panel: gym in one tap (start or resume), bodyweight in two. */
export function WorkoutPanel() {
  const repo = useFitnessRepo()
  const settings = useFitnessSettings()
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [weighing, setWeighing] = useState(false)
  const [weight, setWeight] = useState('')
  const q = useQuery(async () => {
    const [inProgress, recent, latest] = await Promise.all([repo.inProgress(), repo.workouts(30), repo.latestBodyweight()])
    const today = todayLocal(new Date(), 0)
    const days = new Set(recent.map((w) => localDayOf(w.ts, w.tz_offset_min, 0)))
    return { inProgress, last: recent[0] ?? null, week: consistency(days, today, 7), latest }
  }, ['workouts', 'log_entries'])
  const d = q.data
  const unit = settings.data?.unit ?? 'kg'
  const logWeight = async () => {
    const v = Number(weight)
    if (!v) return
    await repo.logBodyweight(v, unit)
    toast(`${v} ${unit}`)
    setWeighing(false)
    setWeight('')
  }
  return (
    <div className="card stack" style={{ gap: 10 }}>
      <SectionTitle>
        <Link to="/m/fitness">Gym</Link>
        {d ? <span className="pill">{d.week.hit} of 7</span> : null}
      </SectionTitle>
      <div className="row" style={{ minHeight: 44 }}>
        <span className="grow muted small">{d?.last ? `Last ${agoLabel(Date.parse(d.last.ts))}` : 'No sessions yet'}</span>
        {d?.inProgress ? (
          <Button variant="primary" onClick={() => navigate(`/m/fitness/workout/${d.inProgress!.id}`)}>
            Resume
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setStarting(true)}>
            Start
          </Button>
        )}
      </div>
      <div className="row" style={{ minHeight: 44 }}>
        <span className="grow muted small">{d?.latest ? `Weight ${d.latest.value} ${d.latest.unit ?? unit} · ${agoLabel(Date.parse(d.latest.ts))}` : 'Weight'}</span>
        <Button
          onClick={() => {
            setWeight(d?.latest?.value ? String(d.latest.value) : '')
            setWeighing(true)
          }}
        >
          Weigh
        </Button>
      </div>
      <StartSheet open={starting} onClose={() => setStarting(false)} />
      <Sheet open={weighing} onClose={() => setWeighing(false)} title="Weight">
        <div className="stack">
          <input type="number" inputMode="decimal" step="0.1" aria-label="Bodyweight today" placeholder={unit} value={weight} onChange={(e) => setWeight(e.target.value)} autoFocus />
          <div className="btn-row">
            <Button onClick={() => setWeighing(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void logWeight()} disabled={!Number(weight)}>
              Save
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
