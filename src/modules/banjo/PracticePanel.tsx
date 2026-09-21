import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from '@/app/shellStore'
import { consistencyLabel } from '@/core/consistency/consistency'
import { minutesLabel } from '@/core/ui/format'
import { Button, SectionTitle } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { usePlan } from './learning/usePlan'
import { elapsedLabel, usePracticeTimer } from './timerStore'
import { useBanjoRepo, usePracticeStats } from './useBanjo'

/** Today panel: one tap starts practice, one tap stops it; the log is written with what was worked on. */
export function PracticePanel() {
  const repo = useBanjoRepo()
  const stats = usePracticeStats()
  const plan = usePlan()
  const startedAt = usePracticeTimer((t) => t.startedAt)
  const start = usePracticeTimer((t) => t.start)
  const stop = usePracticeTimer((t) => t.stop)
  const [now, setNow] = useState(Date.now())
  const [finishing, setFinishing] = useState<number | null>(null)
  useEffect(() => {
    if (startedAt === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const d = stats.data
  return (
    <div className="card stack" style={{ gap: 10 }}>
      <SectionTitle>
        <Link to="/m/banjo">Banjo</Link>
        {d ? <span className="pill">{consistencyLabel(d.week)}</span> : null}
      </SectionTitle>
      <div className="row" style={{ minHeight: 44 }}>
        <span className="grow">{startedAt !== null ? <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 700 }}>{elapsedLabel(startedAt, now)}</span> : d ? `${minutesLabel(d.minutesThisWeek)} this week` : ''}</span>
        {startedAt === null ? (
          <Button variant="primary" onClick={start}>
            Start
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setFinishing(stop())}>
            Stop
          </Button>
        )}
      </div>
      {plan.data && (plan.data.dueCount > 0 || plan.data.plan.learn) ? (
        <div className="row" style={{ minHeight: 36 }}>
          <span className="grow muted small">
            {plan.data.dueCount ? `${plan.data.dueCount} due` : 'Nothing due'}
            {plan.data.plan.learn ? ` · learn ${plan.data.plan.learn.piece.title}` : ''}
          </span>
          <Link to="/m/banjo/plan" className="btn">
            Plan
          </Link>
        </div>
      ) : null}
      <FinishSheet minutes={finishing} onClose={() => setFinishing(null)} lastWorkedOn={String(d?.last?.payload.worked_on ?? '')} onSave={async (minutes, worked_on, pieceId) => {
        await repo.logPractice({ minutes, worked_on, piece_id: pieceId })
        toast(`Practice ${minutesLabel(minutes)}`)
      }} />
    </div>
  )
}

export function FinishSheet({ minutes, onClose, onSave, lastWorkedOn }: { minutes: number | null; onClose: () => void; onSave: (minutes: number, workedOn: string, pieceId: string | null) => Promise<void>; lastWorkedOn: string }) {
  const repo = useBanjoRepo()
  const [workedOn, setWorkedOn] = useState(lastWorkedOn)
  const [pieceId, setPieceId] = useState<string | null>(null)
  const [mins, setMins] = useState(minutes ?? 0)
  const pieces = useQuery(() => repo.pieces(), ['banjo_pieces'])
  useEffect(() => {
    if (minutes !== null) {
      setMins(minutes)
      setWorkedOn(lastWorkedOn)
    }
  }, [minutes, lastWorkedOn])
  return (
    <Sheet open={minutes !== null} onClose={onClose} title="Practice">
      <div className="stack">
        <div className="row">
          <input type="number" aria-label="Minutes" min={1} value={mins} onChange={(e) => setMins(Math.max(1, Number(e.target.value) || 1))} style={{ width: 100 }} />
          <span className="muted">min</span>
        </div>
        <input aria-label="Worked on" placeholder="Worked on" value={workedOn} onChange={(e) => setWorkedOn(e.target.value)} />
        {(pieces.data ?? []).length ? (
          <select aria-label="Piece" value={pieceId ?? ''} onChange={(e) => setPieceId(e.target.value || null)}>
            <option value="">No piece</option>
            {(pieces.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        ) : null}
        <Button
          variant="primary"
          block
          onClick={() => {
            void onSave(mins, workedOn, pieceId)
            onClose()
          }}
        >
          Save
        </Button>
      </div>
    </Sheet>
  )
}
