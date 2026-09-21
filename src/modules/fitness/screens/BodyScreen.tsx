import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { toast } from '@/app/shellStore'
import { calendarDay, formatDay, localDayOf } from '@/core/time/localDay'
import { Button, Card, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { Sparkline } from '@/core/ui/Sparkline'
import { useQuery } from '@/core/ui/useQuery'
import { ACTIVITY_TYPES } from '../data/recovery'
import { useFitnessRepo, useFitnessSettings } from '../useFitness'

/** Bodyweight (one reading per day, goal, trend) and cardio activities. */
export function BodyScreen() {
  const repo = useFitnessRepo()
  const settings = useFitnessSettings()
  const [weight, setWeight] = useState('')
  const [day, setDay] = useState(calendarDay())
  const [type, setType] = useState('run')
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [rpe, setRpe] = useState<number | null>(null)
  const q = useQuery(async () => ({ weights: await repo.bodyweights(new Date(Date.now() - 365 * 86_400_000).toISOString()), activities: (await repo.activities(new Date(Date.now() - 90 * 86_400_000).toISOString())).reverse() }), ['log_entries'])
  const unit = settings.data?.unit ?? 'kg'
  const weights = q.data?.weights ?? []
  const latest = weights[weights.length - 1]
  const goal = settings.data?.weightGoal ?? null
  const logWeight = async () => {
    const v = Number(weight)
    if (!v) return
    await repo.logBodyweight(v, unit, day)
    setWeight('')
    toast(`${v} ${unit}`)
  }
  const logActivity = async () => {
    const m = Number(minutes)
    if (!m) return
    await repo.logActivity({ type, minutes: m, distance_km: distance ? Number(distance) : null, rpe })
    setMinutes('')
    setDistance('')
    setRpe(null)
    toast('Logged')
  }
  return (
    <Screen title="Body">
      <Card>
        <div className="kv">
          <span>Weight</span>
          <span className="big">{latest ? `${latest.value} ${latest.unit ?? unit}` : '–'}</span>
        </div>
        {goal !== null ? (
          <div className="kv small">
            <span className="muted">Goal</span>
            <span>
              {goal} {unit}
              {latest && latest.value !== null ? ` · ${Math.round((latest.value - goal) * 10) / 10 > 0 ? `${Math.round((latest.value - goal) * 10) / 10} to lose` : `${Math.round((goal - latest.value) * 10) / 10} to gain`}` : ''}
            </span>
          </div>
        ) : null}
        <Sparkline values={weights.map((w) => w.value ?? 0)} label="Bodyweight trend" />
        <div className="row" style={{ minHeight: 40 }}>
          <input type="number" inputMode="decimal" step="0.1" aria-label="Bodyweight" placeholder={unit} value={weight} onChange={(e) => setWeight(e.target.value)} style={{ width: 110 }} />
          <input type="date" aria-label="Weigh-in date" value={day} onChange={(e) => setDay(e.target.value)} style={{ width: 150 }} />
          <Button variant="primary" onClick={() => void logWeight()} disabled={!Number(weight)}>
            Log
          </Button>
        </div>
      </Card>
      <SectionTitle>Activity</SectionTitle>
      <Card>
        <Chips label="Activity type" value={type} onChange={setType} options={ACTIVITY_TYPES.map((t) => ({ label: t.label, value: t.id }))} />
        <div className="row" style={{ minHeight: 40 }}>
          <input type="number" inputMode="decimal" aria-label="Minutes" placeholder="min" value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ width: 90 }} />
          <input type="number" inputMode="decimal" step="0.1" aria-label="Distance km" placeholder="km" value={distance} onChange={(e) => setDistance(e.target.value)} style={{ width: 90 }} />
          <select aria-label="Effort RPE" value={rpe ?? ''} onChange={(e) => setRpe(e.target.value ? Number(e.target.value) : null)}>
            <option value="">RPE</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={() => void logActivity()} disabled={!Number(minutes)}>
            Log
          </Button>
        </div>
      </Card>
      {q.data && q.data.activities.length === 0 ? <EmptyState>No activities yet</EmptyState> : null}
      <div className="list">
        {(q.data?.activities ?? []).map((a) => (
          <div key={a.id} className="list-row" style={{ minHeight: 40 }}>
            <span className="muted small" style={{ width: 100 }}>
              {formatDay(localDayOf(a.ts, a.tz_offset_min, 0))}
            </span>
            <span className="grow">
              {ACTIVITY_TYPES.find((t) => t.id === a.payload.type)?.label ?? String(a.payload.type)} · {Math.round(a.value ?? 0)} min
              {typeof a.payload.distance_km === 'number' ? ` · ${a.payload.distance_km} km` : ''}
              {typeof a.payload.rpe === 'number' ? ` · RPE ${a.payload.rpe}` : ''}
            </span>
            <Button ariaLabel="Remove activity" onClick={() => void repo.logs.remove(a.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <SectionTitle>Weigh-ins</SectionTitle>
      <div className="list">
        {[...weights].reverse().slice(0, 30).map((w) => (
          <div key={w.id} className="list-row" style={{ minHeight: 36 }}>
            <span className="muted small" style={{ width: 100 }}>
              {formatDay(localDayOf(w.ts, w.tz_offset_min, 0))}
            </span>
            <span className="grow">
              {w.value} {w.unit}
            </span>
            <Button ariaLabel="Remove weigh-in" onClick={() => void repo.logs.remove(w.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
    </Screen>
  )
}
