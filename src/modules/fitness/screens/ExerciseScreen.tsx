import { useState } from 'react'
import { useParams } from 'react-router'
import { calendarDay, formatDay, localDayOf } from '@/core/time/localDay'
import { Button, Card, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { Sparkline } from '@/core/ui/Sparkline'
import { useQuery } from '@/core/ui/useQuery'
import { BODYWEIGHT_LIFT_IDS, EXERCISE_BY_ID } from '../data/exercises'
import { epley, topSet } from '../logic'
import { fmtSet, useFitnessRepo, useFitnessSettings } from '../useFitness'

/** History, personal best, estimated and manual one-rep max, and a target for one lift. */
export function ExerciseScreen() {
  const { id = '' } = useParams()
  const repo = useFitnessRepo()
  const settings = useFitnessSettings()
  const [manual, setManual] = useState('')
  const [target, setTarget] = useState('')
  const q = useQuery(async () => ({ history: await repo.historyFor(id, 100), pb: await repo.record(id, 'pb'), manual: await repo.record(id, 'manual_1rm'), goal: (await repo.goals()).find((g) => g.exercise_id === id) ?? null, custom: (await repo.customExercises()).find((c) => c.id === id) ?? null }), ['workouts', 'workout_sets', 'fitness_records', 'fitness_goals'], [id])
  const d = q.data
  const def = EXERCISE_BY_ID[id] ?? (d?.custom ? { name: d.custom.name, muscle: d.custom.muscle, cue: d.custom.cue } : { name: id, muscle: '', cue: '' })
  const unit = settings.data?.unit ?? 'kg'
  const byReps = BODYWEIGHT_LIFT_IDS.includes(id)
  const tops = (d?.history ?? []).map((h) => ({ ts: h.workout.ts, top: topSet(h.sets) })).filter((x) => x.top)
  const trend = [...tops].reverse().map((x) => (byReps ? (x.top!.reps ?? 0) : epley(x.top!.weight ?? 0, x.top!.reps ?? 0)))
  const latest = tops[0]?.top ?? null
  const estimate = d?.manual?.value ?? (d?.pb && d.pb.weight && d.pb.reps ? epley(d.pb.weight, d.pb.reps) : latest ? (byReps ? latest.reps : epley(latest.weight ?? 0, latest.reps ?? 0)) : null)
  return (
    <Screen title={def.name}>
      <Card>
        <div className="muted small">
          {def.muscle}
          {def.cue ? ` · ${def.cue}` : ''}
        </div>
        <div className="kv">
          <span>{byReps ? 'Best reps' : 'Estimated 1RM'}</span>
          <span className="big">{estimate === null ? '–' : byReps ? `${estimate}` : `${Math.round(estimate)} ${unit}`}</span>
        </div>
        {d?.pb ? (
          <div className="kv small">
            <span className="muted">PB</span>
            <span>
              {fmtSet(d.pb, unit)}
              {d.pb.day ? ` · ${formatDay(d.pb.day)}` : ''}
            </span>
          </div>
        ) : null}
        {d?.goal?.target ? (
          <div className="kv small">
            <span className="muted">Target</span>
            <span>
              {d.goal.target} {byReps ? 'reps' : unit}
              {estimate !== null ? ` · ${Math.max(0, Math.round((d.goal.target - estimate) * 10) / 10)} to go` : ''}
            </span>
          </div>
        ) : null}
        <Sparkline values={trend} label={`${def.name} trend`} />
        {!byReps ? (
          <div className="row" style={{ minHeight: 36 }}>
            <input type="number" inputMode="decimal" aria-label="Manual 1RM" placeholder={`Tested 1RM (${unit})`} value={manual} onChange={(e) => setManual(e.target.value)} style={{ width: 150 }} />
            <Button onClick={() => void repo.setRecord(id, 'manual_1rm', { value: Number(manual), day: calendarDay() }).then(() => setManual(''))} disabled={!Number(manual)}>
              Save
            </Button>
          </div>
        ) : null}
        <div className="row" style={{ minHeight: 36 }}>
          <input type="number" inputMode="decimal" aria-label="Target" placeholder={`Target (${byReps ? 'reps' : unit})`} value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: 150 }} />
          <Button onClick={() => void repo.setGoal(id, { target: Number(target), current: estimate, is_bodyweight: byReps ? 1 : 0 }).then(() => setTarget(''))} disabled={!Number(target)}>
            Set
          </Button>
          {d?.goal ? (
            <Button ariaLabel="Remove target" onClick={() => void repo.removeGoal(d.goal!.id)}>
              ×
            </Button>
          ) : null}
        </div>
      </Card>
      <SectionTitle>History · {d?.history.length ?? 0}</SectionTitle>
      {d && d.history.length === 0 ? <EmptyState>Not logged yet</EmptyState> : null}
      <div className="list">
        {(d?.history ?? []).map((h) => (
          <div key={h.exercise.id} className="list-row" style={{ minHeight: 40 }}>
            <span className="muted small" style={{ width: 100 }}>
              {formatDay(localDayOf(h.workout.ts, h.workout.tz_offset_min, 0))}
            </span>
            <span className="grow">{h.sets.map((s) => fmtSet(s, h.workout.unit)).join(', ')}</span>
          </div>
        ))}
      </div>
    </Screen>
  )
}
