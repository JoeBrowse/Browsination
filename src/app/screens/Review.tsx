import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { reviewRepo } from '@/core/review/repo'
import { REVIEW_STEPS, reviewWeekFor } from '@/core/review/logic'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { Button, Card, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { ConsistencyStep, ListStep, PrioritiesStep, WeekAheadStep } from '../review/steps'
import { useServices } from '../services'
import { toast } from '../shellStore'

/**
 * Weekly review: six short steps, about ten minutes. The row is created on first open and
 * every step and choice is saved as it happens, so leaving and coming back resumes.
 */
export function ReviewScreen() {
  const s = useServices()
  const navigate = useNavigate()
  const repo = useMemo(() => reviewRepo(s.db), [s.db])
  const today = calendarDay()
  const q = useQuery(async () => {
    const day = await s.settings.get('review.day')
    const week = reviewWeekFor(today, day)
    return repo.start(week)
  }, ['reviews', 'settings'])
  const row = q.data
  const [notes, setNotes] = useState<string | null>(null)
  if (!row) return <Screen title="Weekly review">{''}</Screen>
  const step = Math.min(row.step, REVIEW_STEPS.length - 1)
  const go = (n: number) => void repo.setStep(row.id, Math.max(0, Math.min(REVIEW_STEPS.length - 1, n)))
  const priorities = repo.priorityIds(row)
  const finish = async () => {
    if (notes !== null) await repo.setNotes(row.id, notes)
    await repo.complete(row.id)
    toast('Review done')
    navigate('/today')
  }
  const title = REVIEW_STEPS[step]!
  return (
    <Screen title="Weekly review" right={<span className="muted small">{`${step + 1} of ${REVIEW_STEPS.length}`}</span>}>
      <div className="progress" aria-label={`Step ${step + 1} of ${REVIEW_STEPS.length}`}>
        <div style={{ width: `${((step + 1) / REVIEW_STEPS.length) * 100}%` }} />
      </div>
      <div className="kv" style={{ minHeight: 36 }}>
        <span className="title">{title}</span>
        <span className="muted small">week of {formatDay(row.week)}</span>
      </div>
      {step === 0 ? <ListStep status="inbox" empty="Inbox empty" /> : null}
      {step === 1 ? <ListStep status="waiting" empty="Nothing waiting" /> : null}
      {step === 2 ? <WeekAheadStep week={row.week} /> : null}
      {step === 3 ? <ConsistencyStep /> : null}
      {step === 4 ? <PrioritiesStep selected={priorities} onChange={(ids) => void repo.setPriorities(row.id, ids)} /> : null}
      {step === 5 ? (
        <Card>
          <div className="kv">
            <span>Priorities</span>
            <span className="pill">{priorities.length}</span>
          </div>
          <textarea aria-label="Review notes" placeholder="Notes (optional)" value={notes ?? row.notes} onChange={(e) => setNotes(e.target.value)} />
          {row.completed_at ? <div className="muted small">Completed {formatDay(row.completed_at.slice(0, 10))}</div> : null}
        </Card>
      ) : null}
      <div className="btn-row" style={{ marginTop: 16 }}>
        <Button onClick={() => go(step - 1)} disabled={step === 0}>
          Back
        </Button>
        {step < REVIEW_STEPS.length - 1 ? (
          <Button variant="primary" onClick={() => go(step + 1)}>
            Next
          </Button>
        ) : (
          <Button variant="primary" onClick={() => void finish()}>
            Finish
          </Button>
        )}
      </div>
    </Screen>
  )
}
