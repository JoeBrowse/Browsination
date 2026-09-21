import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { consistency } from '@/core/consistency/consistency'
import { lastNDays, localDayOf, todayLocal } from '@/core/time/localDay'
import { Button, Card, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { MUSCLES } from '../data/exercises'
import { readiness, sessionVolume, weeklyVolume, type Stage } from '../logic'
import { agoLabel, useFitnessRepo, useFitnessSettings } from '../useFitness'
import { StartSheet } from '../workout/StartSheet'

const STAGE_LABEL: Record<Stage, string> = { ready: 'ready', amber: 'soon', red: 'recovering', none: '' }

/** Hub: unfinished session, readiness per muscle, this week, recent sessions. */
export function FitnessScreen() {
  const repo = useFitnessRepo()
  const settings = useFitnessSettings()
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const q = useQuery(async () => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 8 * 86_400_000).toISOString()
    const [inProgress, recent, activities] = await Promise.all([repo.inProgress(), repo.recentFull(40), repo.activities(new Date(now.getTime() - 14 * 86_400_000).toISOString())])
    const sessions = recent.map((w) => ({ atMs: Date.parse(w.ts), exercises: w.exercises.map((e) => ({ muscle: e.muscle, exercise_id: e.exercise_id, sets: e.sets })) }))
    const acts = activities.map((a) => ({ atMs: Date.parse(a.ts), type: String(a.payload.type ?? 'other'), rpe: typeof a.payload.rpe === 'number' ? a.payload.rpe : null }))
    const week = recent.filter((w) => w.ts >= weekAgo)
    const today = todayLocal(now, 0)
    const days = new Set(recent.map((w) => localDayOf(w.ts, w.tz_offset_min, 0)))
    return { inProgress, recent, sessions, acts, week, weekVolume: weeklyVolume(MUSCLES, week.map((w) => ({ atMs: Date.parse(w.ts), exercises: w.exercises.map((e) => ({ muscle: e.muscle, exercise_id: e.exercise_id, sets: e.sets })) }))), consistency: consistency(days, today, 7), trainedDays: lastNDays(today, 7).filter((d) => days.has(d)).length }
  }, ['workouts', 'workout_exercises', 'workout_sets', 'log_entries'])
  const d = q.data
  const ready = d ? readiness(MUSCLES, d.sessions, d.acts, Date.now(), settings.data?.paceFactor ?? 1) : []
  const unit = settings.data?.unit ?? 'kg'
  return (
    <Screen
      title="Gym"
      right={
        <Button variant="primary" onClick={() => setStarting(true)}>
          Start
        </Button>
      }
    >
      {d?.inProgress ? (
        <Card>
          <div className="kv">
            <span className="title">{d.inProgress.split || 'Unfinished session'}</span>
            <span className="muted small">{d.inProgress.exercises.length} exercises</span>
          </div>
          <div className="btn-row">
            <Button onClick={() => void repo.deleteWorkout(d.inProgress!.id)}>Discard</Button>
            <Button variant="primary" onClick={() => navigate(`workout/${d.inProgress!.id}`)}>
              Resume
            </Button>
          </div>
        </Card>
      ) : null}
      <div className="tray" style={{ marginTop: 12 }}>
        <Link to="history" className="tile">
          <span className="label">History</span>
        </Link>
        <Link to="programmes" className="tile">
          <span className="label">Programmes</span>
        </Link>
        <Link to="exercises" className="tile">
          <span className="label">Exercises</span>
        </Link>
        <Link to="body" className="tile">
          <span className="label">Body</span>
        </Link>
      </div>
      <SectionTitle>
        This week
        {d ? <span className="pill">{d.trainedDays} of 7</span> : null}
      </SectionTitle>
      {d ? (
        <Card>
          <div className="kv small">
            <span>Sessions</span>
            <span>{d.week.length}</span>
          </div>
          <div className="kv small">
            <span>Sets</span>
            <span>{d.week.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.length, 0), 0)}</span>
          </div>
          <div className="kv small">
            <span>Volume</span>
            <span>
              {d.week.reduce((n, w) => n + sessionVolume(w.exercises), 0).toLocaleString('en-GB')} {unit}
            </span>
          </div>
        </Card>
      ) : null}
      <SectionTitle>Readiness</SectionTitle>
      <div className="chips">
        {ready
          .filter((r) => r.stage !== 'none')
          .map((r) => (
            <span key={r.muscle} className={`chip${r.stage === 'ready' ? ' on' : ''}`} style={{ opacity: r.stage === 'red' ? 0.6 : 1 }} title={STAGE_LABEL[r.stage]}>
              {r.muscle}
              {r.stage !== 'ready' ? ` · ${Math.ceil(r.hoursLeft)}h` : ''}
              {d && d.weekVolume.get(r.muscle) ? ` · ${d.weekVolume.get(r.muscle)}` : ''}
            </span>
          ))}
        {d && ready.every((r) => r.stage === 'none') ? <span className="muted small">Nothing trained yet</span> : null}
      </div>
      <SectionTitle>Recent</SectionTitle>
      {d && d.recent.length === 0 ? <EmptyState>No sessions yet</EmptyState> : null}
      <div className="list">
        {(d?.recent ?? []).slice(0, 5).map((w) => (
          <button key={w.id} className="list-row" style={{ minHeight: 44 }} onClick={() => navigate(`workout/${w.id}`)}>
            <div className="grow" style={{ textAlign: 'left' }}>
              <div className="title">{w.split || 'Session'}</div>
              <div className="sub">
                {w.exercises.length} exercises · {w.exercises.reduce((n, e) => n + e.sets.length, 0)} sets · {sessionVolume(w.exercises).toLocaleString('en-GB')} {w.unit}
              </div>
            </div>
            <span className="muted small">{agoLabel(Date.parse(w.ts))}</span>
          </button>
        ))}
      </div>
      <StartSheet open={starting} onClose={() => setStarting(false)} />
    </Screen>
  )
}
