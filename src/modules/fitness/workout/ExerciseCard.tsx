import { Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { EXERCISE_BY_ID } from '../data/exercises'
import type { FullExercise, SetRow, WeightUnit } from '../repo'
import { fmtSet, useFitnessRepo } from '../useFitness'

const RIR = [
  { value: null, label: '–' },
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3+' },
]

/** One exercise in a workout: last time, planned sets with tick boxes, add set, notes. */
export function ExerciseCard({ exercise, unit, editable, beforeTs }: { exercise: FullExercise; unit: WeightUnit; editable: boolean; beforeTs: string }) {
  const repo = useFitnessRepo()
  const [notesOpen, setNotesOpen] = useState(!!exercise.notes)
  const last = useQuery(() => repo.lastFor(exercise.exercise_id, beforeTs), ['workouts'], [exercise.exercise_id, beforeTs])
  const cue = EXERCISE_BY_ID[exercise.exercise_id]?.cue
  const addSet = async () => {
    const prev = exercise.sets[exercise.sets.length - 1]
    await repo.addSet(exercise.id, { weight: prev?.weight ?? null, reps: prev?.reps ?? null })
  }
  return (
    <div className="card stack" style={{ gap: 6 }}>
      <div className="kv" style={{ minHeight: 32 }}>
        <span className="title">
          {exercise.name}
          {exercise.superset ? <span className="pill" style={{ marginLeft: 6 }}>{exercise.superset}</span> : null}
        </span>
        <span className="muted small">
          {exercise.muscle}
          {exercise.method ? ` · ${exercise.method}` : ''}
        </span>
      </div>
      {last.data ? (
        <div className="muted small">
          Last: {last.data.sets.map((s) => fmtSet(s, unit)).join(', ')} · {last.data.workout.ts.slice(0, 10)}
        </div>
      ) : last.loading ? null : (
        <div className="muted small">First time{cue ? ` · ${cue}` : ''}</div>
      )}
      {exercise.sets.map((s, i) => (
        <SetLine key={s.id} set={s} index={i} unit={unit} editable={editable} />
      ))}
      {editable ? (
        <div className="row" style={{ minHeight: 36 }}>
          <Button onClick={() => void addSet()}>Add set</Button>
          <Button onClick={() => setNotesOpen((v) => !v)}>Notes</Button>
          <span className="grow" />
          <Button ariaLabel={`Remove ${exercise.name}`} onClick={() => void repo.removeExercise(exercise.id)}>
            ×
          </Button>
        </div>
      ) : null}
      {notesOpen ? <textarea aria-label={`Notes ${exercise.name}`} placeholder="Notes" defaultValue={exercise.notes} onBlur={(e) => void repo.updateExercise(exercise.id, { notes: e.target.value })} /> : null}
    </div>
  )
}

function SetLine({ set, index, unit, editable }: { set: SetRow; index: number; unit: WeightUnit; editable: boolean }) {
  const repo = useFitnessRepo()
  const num = (v: string): number | null => (v.trim() === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)
  return (
    <div className="row" style={{ minHeight: 40, gap: 6 }}>
      <button className={`check${set.done ? ' on' : ''}`} aria-label={`Set ${index + 1} done`} aria-pressed={!!set.done} disabled={!editable} onClick={() => void repo.updateSet(set.id, { done: set.done ? 0 : 1 })} style={{ marginTop: 0, width: 32, height: 32 }}>
        <Check size={16} aria-hidden />
      </button>
      <input type="number" inputMode="decimal" step="any" aria-label={`Set ${index + 1} weight`} placeholder={unit} defaultValue={set.weight ?? ''} disabled={!editable} onBlur={(e) => num(e.target.value) !== set.weight && void repo.updateSet(set.id, { weight: num(e.target.value) })} style={{ width: 84 }} />
      <span className="muted small">×</span>
      <input type="number" inputMode="numeric" aria-label={`Set ${index + 1} reps`} placeholder="reps" defaultValue={set.reps ?? ''} disabled={!editable} onBlur={(e) => num(e.target.value) !== set.reps && void repo.updateSet(set.id, { reps: num(e.target.value) })} style={{ width: 72 }} />
      <select aria-label={`Set ${index + 1} RIR`} value={set.rir === null ? '' : String(set.rir)} disabled={!editable} onChange={(e) => void repo.updateSet(set.id, { rir: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: 64 }}>
        {RIR.map((o) => (
          <option key={o.label} value={o.value === null ? '' : String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      {editable ? (
        <Button ariaLabel={`Remove set ${index + 1}`} onClick={() => void repo.removeSet(set.id)}>
          ×
        </Button>
      ) : null}
    </div>
  )
}
