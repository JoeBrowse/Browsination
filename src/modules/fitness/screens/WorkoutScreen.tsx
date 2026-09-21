import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/shellStore'
import { tzOffsetMin } from '@/core/time/localDay'
import { Button, Card, EmptyState, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import type { ExerciseDef } from '../data/exercises'
import { plannedSets, sessionVolume } from '../logic'
import { useFitnessRepo, useFitnessSettings } from '../useFitness'
import { ExerciseCard } from '../workout/ExerciseCard'
import { ExercisePicker } from '../workout/ExercisePicker'

const pad = (n: number) => String(n).padStart(2, '0')
const localDate = (ts: string) => {
  const d = new Date(ts)
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }
}

/** Log a session: every change saves at once, so closing the app loses nothing. Finished sessions open here too, for edits. */
export function WorkoutScreen() {
  const { id = '' } = useParams()
  const repo = useFitnessRepo()
  const settings = useFitnessSettings()
  const navigate = useNavigate()
  const [picking, setPicking] = useState(false)
  const [armed, setArmed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const q = useQuery(() => repo.workout(id), ['workouts', 'workout_exercises', 'workout_sets'], [id])
  const w = q.data
  if (!w) return <Screen title="Workout">{q.loading ? null : <EmptyState>Not found</EmptyState>}</Screen>
  const unit = w.unit
  const finished = w.finished_at !== null
  const { date, time } = localDate(w.ts)
  const setWhen = (d: string, t: string) => {
    const next = new Date(`${d}T${t || '12:00'}:00`)
    if (Number.isNaN(next.getTime())) return
    if (next.getTime() > Date.now()) return
    void repo.updateWorkout(w.id, { ts: next.toISOString(), tz_offset_min: tzOffsetMin(next) })
  }
  const pick = async (e: ExerciseDef) => {
    const last = await repo.lastFor(e.id, w.ts)
    await repo.addExercise(w.id, { exercise_id: e.id, name: e.name, muscle: e.muscle, sets: plannedSets(last?.sets ?? null, settings.data?.startingSets ?? 1) })
    setPicking(false)
  }
  const finish = async () => {
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 4000)
      return
    }
    const done = await repo.finishWorkout(w.id, finished ? w.finished_at! : undefined)
    if (!done) return
    const sets = done.exercises.reduce((n, e) => n + e.sets.length, 0)
    toast(sets ? `${done.exercises.length} exercises · ${sets} sets · ${sessionVolume(done.exercises)} ${unit}` : 'Nothing logged')
    navigate('/m/fitness')
  }
  const remove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await repo.deleteWorkout(w.id)
    navigate('/m/fitness')
  }
  const isBackdated = date !== localDate(new Date().toISOString()).date
  return (
    <Screen
      title={w.split || (finished ? 'Session' : 'Workout')}
      right={
        <Button variant="primary" onClick={() => void finish()}>
          {armed ? 'Sure?' : finished ? 'Save' : 'Finish'}
        </Button>
      }
    >
      <Card>
        <div className="row" style={{ minHeight: 36 }}>
          <span className="grow small muted">{finished ? 'Logged for' : isBackdated ? 'Logging for' : 'Logging for now'}</span>
          <input type="date" aria-label="Workout date" value={date} onChange={(e) => setWhen(e.target.value, time)} style={{ width: 150 }} />
          <input type="time" aria-label="Workout time" value={time} onChange={(e) => setWhen(date, e.target.value)} style={{ width: 100 }} />
        </div>
        <div className="row" style={{ minHeight: 36 }}>
          <input aria-label="Session name" placeholder="Session name" defaultValue={w.split} onBlur={(e) => void repo.updateWorkout(w.id, { split: e.target.value })} />
        </div>
      </Card>
      {w.exercises.length === 0 ? <EmptyState>No exercises yet</EmptyState> : null}
      {w.exercises.map((e) => (
        <ExerciseCard key={e.id} exercise={e} unit={unit} editable beforeTs={w.ts} />
      ))}
      <Button block onClick={() => setPicking(true)}>
        Add exercise
      </Button>
      {finished ? (
        <div style={{ marginTop: 20 }}>
          <Button variant="danger" onClick={() => void remove()}>
            {confirmDelete ? 'Really delete this session' : 'Delete session'}
          </Button>
        </div>
      ) : null}
      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={(e) => void pick(e)} />
    </Screen>
  )
}
