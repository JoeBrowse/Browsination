import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/shellStore'
import { formatDay } from '@/core/time/localDay'
import { Button, Card, Screen, SectionTitle } from '@/core/ui/primitives'
import { Sparkline } from '@/core/ui/Sparkline'
import { useQuery } from '@/core/ui/useQuery'
import { routineStats } from '../logic'
import { useSnookerRepo } from '../useSnooker'

export function RoutineScreen() {
  const { id = '' } = useParams()
  const repo = useSnookerRepo()
  const navigate = useNavigate()
  const [score, setScore] = useState('')
  const q = useQuery(async () => {
    const routine = await repo.routine(id)
    if (!routine) return null
    const attempts = await repo.attempts(id)
    return { routine, attempts, stats: routineStats(attempts.map((a) => a.value ?? 0)) }
  }, ['snooker_routines', 'log_entries'], [id])
  const d = q.data
  if (!d) return <Screen title="Routine">{q.loading ? null : <div className="empty">Not found</div>}</Screen>
  const { routine, stats } = d
  const log = async () => {
    const n = Number(score)
    if (!Number.isFinite(n)) return
    await repo.logAttempt(routine, n)
    toast(stats.best !== null && n > stats.best ? `Personal best ${n}` : `Logged ${n}`)
    setScore('')
  }
  return (
    <Screen title={routine.name}>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void log()
        }}
      >
        <input type="number" inputMode="decimal" aria-label="Score" placeholder={routine.unit} value={score} onChange={(e) => setScore(e.target.value)} />
        <Button type="submit" variant="primary" disabled={score === ''}>
          Log
        </Button>
      </form>
      <Card style={{ marginTop: 12 }}>
        <div className="kv">
          <span>Personal best</span>
          <span className="pill accent">{stats.best ?? '–'}</span>
        </div>
        <div className="kv">
          <span>Recent average (10)</span>
          <span>{stats.recentAvg ?? '–'}{stats.delta !== null ? <span className="muted small"> {stats.delta > 0 ? '+' : ''}{stats.delta}</span> : null}</span>
        </div>
        <div className="kv">
          <span>Attempts</span>
          <span>{stats.count}</span>
        </div>
        <Sparkline values={stats.trend} label={`${routine.name} trend`} />
      </Card>
      <SectionTitle>Attempts</SectionTitle>
      <div className="list">
        {[...d.attempts].reverse().map((a) => (
          <div key={a.id} className="list-row" style={{ minHeight: 40 }}>
            <span className="grow small muted">{formatDay(a.ts.slice(0, 10))}</span>
            <span>{a.value}</span>
            <Button ariaLabel="Remove attempt" onClick={() => void repo.removeEntry(a.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <Card style={{ marginTop: 16 }}>
        <div className="stack" style={{ gap: 8 }}>
          <input aria-label="Routine name" defaultValue={routine.name} onBlur={(e) => void repo.updateRoutine(routine.id, { name: e.target.value.trim() || routine.name })} />
          <textarea aria-label="Routine description" placeholder="How it works" defaultValue={routine.description} onBlur={(e) => void repo.updateRoutine(routine.id, { description: e.target.value })} />
          <Button
            variant="danger"
            onClick={() => {
              void repo.updateRoutine(routine.id, { archived_at: new Date().toISOString() })
              navigate('/m/snooker')
            }}
          >
            Archive routine
          </Button>
        </div>
      </Card>
    </Screen>
  )
}
