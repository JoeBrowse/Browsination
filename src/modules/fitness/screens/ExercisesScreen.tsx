import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { findExercises, type ExerciseDef } from '../data/exercises'
import { useFitnessRepo } from '../useFitness'

/** The database plus custom lifts; tap for history, records and goals. */
export function ExercisesScreen() {
  const repo = useFitnessRepo()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const custom = useQuery(() => repo.customExercises(), ['fitness_exercises'])
  const trained = useQuery(async () => new Set((await repo.recentFull(200)).flatMap((w) => w.exercises.map((e) => e.exercise_id))), ['workouts'])
  const extra: ExerciseDef[] = (custom.data ?? []).map((c) => ({ id: c.id, name: c.name, muscle: c.muscle, type: c.type, pattern: c.pattern, cue: c.cue }))
  const list = findExercises(q, extra)
  const done = trained.data ?? new Set<string>()
  const sorted = [...list].sort((a, b) => Number(done.has(b.id)) - Number(done.has(a.id)) || a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name))
  return (
    <Screen title="Exercises">
      <input aria-label="Search exercises" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list" style={{ marginTop: 10 }}>
        {sorted.map((e) => (
          <button key={e.id} className="list-row" style={{ minHeight: 44, opacity: done.has(e.id) ? 1 : 0.7 }} onClick={() => navigate(`/m/fitness/exercise/${e.id}`)}>
            <span className="grow" style={{ textAlign: 'left' }}>
              {e.name}
            </span>
            <span className="muted small">{e.muscle}</span>
          </button>
        ))}
      </div>
    </Screen>
  )
}
