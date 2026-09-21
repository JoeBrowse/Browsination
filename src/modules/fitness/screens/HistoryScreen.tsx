import { useNavigate } from 'react-router'
import { formatDay, localDayOf } from '@/core/time/localDay'
import { EmptyState, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { sessionVolume } from '../logic'
import { useFitnessRepo } from '../useFitness'

export function HistoryScreen() {
  const repo = useFitnessRepo()
  const navigate = useNavigate()
  const q = useQuery(() => repo.recentFull(200), ['workouts', 'workout_exercises', 'workout_sets'])
  return (
    <Screen title="History">
      {q.data && q.data.length === 0 ? <EmptyState>No sessions yet</EmptyState> : null}
      <div className="list">
        {(q.data ?? []).map((w) => (
          <button key={w.id} className="list-row" style={{ minHeight: 44 }} onClick={() => navigate(`/m/fitness/workout/${w.id}`)}>
            <span className="muted small" style={{ width: 100, textAlign: 'left' }}>
              {formatDay(localDayOf(w.ts, w.tz_offset_min, 0))}
            </span>
            <div className="grow" style={{ textAlign: 'left' }}>
              <div>{w.split || 'Session'}</div>
              <div className="sub">{w.exercises.map((e) => e.name).join(', ')}</div>
            </div>
            <span className="pill">{sessionVolume(w.exercises).toLocaleString('en-GB')}</span>
          </button>
        ))}
      </div>
    </Screen>
  )
}
