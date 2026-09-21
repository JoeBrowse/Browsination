import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from '@/app/shellStore'
import { minutesLabel } from '@/core/ui/format'
import { Button, Card, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { chunkStage, dueLabel, percent, QUALITY_LABEL, type ChunkLike, type Quality } from '../learning/logic'
import { usePlan } from '../learning/usePlan'
import { FinishSheet } from '../PracticePanel'
import type { PieceRow } from '../repo'
import { elapsedLabel, usePracticeTimer } from '../timerStore'
import { useBanjoRepo } from '../useBanjo'

/**
 * Today's practice plan: due reviews first, alternating pieces, then new bars on the piece that has
 * waited longest. Every row is two taps: open the score, rate it (or say how many bars you learned).
 */
export function PlanScreen() {
  const repo = useBanjoRepo()
  const navigate = useNavigate()
  const q = usePlan()
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
  const d = q.data
  const pieceOf = (id: string): PieceRow | undefined => d?.pieces.find((p) => p.id === id)
  const open = async (pieceId: string) => {
    const files = await repo.pieceFiles(pieceId)
    navigate(files[0] ? `/m/banjo/library/piece/${pieceId}/file/${files[0].id}` : `/m/banjo/library/piece/${pieceId}`)
  }
  const rate = async (c: ChunkLike, quality: Quality) => {
    if (!d) return
    const next = await repo.review(c.id, quality, d.today)
    const piece = pieceOf(c.piece_id)
    toast(`${piece?.title ?? ''} ${c.from_bar}–${c.to_bar}: ${QUALITY_LABEL[quality]} · back in ${next?.interval_days ?? 1}d`)
  }
  const plan = d?.plan
  const nothing = d && plan && plan.reviews.length === 0 && !plan.learn
  return (
    <Screen
      title="Plan"
      right={
        startedAt === null ? (
          <Button variant="primary" onClick={start}>
            Start
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setFinishing(stop())}>
            Stop {elapsedLabel(startedAt, now)}
          </Button>
        )
      }
    >
      {d ? (
        <div className="kv small" style={{ minHeight: 28 }}>
          <span className="muted">
            {d.dueCount} due · {d.reviewsDone} done today
          </span>
          {plan && plan.moreDue > 0 ? <span className="muted">{plan.moreDue} more after these</span> : null}
        </div>
      ) : null}
      {nothing ? (
        <EmptyState>
          {d.pieces.some((p) => p.bars) ? 'Nothing due' : (
            <>
              Set bars on a piece in the <Link to="/m/banjo/library">library</Link>
            </>
          )}
        </EmptyState>
      ) : null}
      {plan && plan.reviews.length ? <SectionTitle>Review</SectionTitle> : null}
      <div className="list">
        {(plan?.reviews ?? []).map((c) => {
          const piece = pieceOf(c.piece_id)
          const stage = chunkStage(c)
          return (
            <div key={c.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
              <div className="row" style={{ minHeight: 32 }}>
                <div className="grow">
                  <div className="title">
                    {piece?.title ?? 'Piece'} <span className="muted">bars {c.from_bar}–{c.to_bar}</span>
                  </div>
                  <div className="sub">
                    {stage} · {dueLabel(c.due, d!.today)}
                    {c.lapses ? ` · slipped ${c.lapses}×` : ''}
                  </div>
                </div>
                <Button onClick={() => void open(c.piece_id)}>Open</Button>
              </div>
              <div className="chips" role="group" aria-label={`Rate ${piece?.title ?? ''} bars ${c.from_bar}–${c.to_bar}`}>
                {([1, 2, 3] as Quality[]).map((qv) => (
                  <button key={qv} className="chip" onClick={() => void rate(c, qv)}>
                    {QUALITY_LABEL[qv]}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {plan?.learn ? <LearnBlock suggestion={plan.learn} progress={d!.progress.get(plan.learn.piece.id)?.learnedFraction ?? null} today={d!.today} onOpen={() => void open(plan.learn!.piece.id)} /> : null}
      <FinishSheet
        minutes={finishing}
        onClose={() => setFinishing(null)}
        lastWorkedOn=""
        onSave={async (minutes, worked_on, pieceId) => {
          await repo.logPractice({ minutes, worked_on, piece_id: pieceId })
          toast(`Practice ${minutesLabel(minutes)}`)
        }}
      />
    </Screen>
  )
}

function LearnBlock({ suggestion, progress, today, onOpen }: { suggestion: NonNullable<ReturnType<typeof usePlan>['data']>['plan']['learn'] & object; progress: number | null; today: string; onOpen: () => void }) {
  const repo = useBanjoRepo()
  const piece = suggestion.piece
  const [bars, setBars] = useState(String(suggestion.suggestedBars))
  const [total, setTotal] = useState('')
  useEffect(() => setBars(String(suggestion.suggestedBars)), [suggestion.suggestedBars, piece.id])
  const learned = async () => {
    const n = Number(bars)
    if (!n || n < 1) return
    const c = await repo.learnBars(piece.id, n, today)
    if (c) toast(`${piece.title} bars ${c.from_bar}–${c.to_bar} · review tomorrow`)
  }
  return (
    <>
      <SectionTitle>Learn new</SectionTitle>
      <Card>
        <div className="row" style={{ minHeight: 32 }}>
          <div className="grow">
            <div className="title">{piece.title}</div>
            <div className="sub">
              {piece.bars ? `from bar ${suggestion.fromBar} of ${piece.bars}` : `from bar ${suggestion.fromBar}`}
              {progress !== null ? ` · ${percent(progress)} learned` : ''}
              {suggestion.reason === 'least recent' ? ' · its turn' : suggestion.reason === 'first' ? ' · not started' : ''}
            </div>
          </div>
          <Button onClick={onOpen}>Open</Button>
        </div>
        {progress !== null ? (
          <div className="progress" aria-label={`${percent(progress)} learned`}>
            <div style={{ width: `${progress * 100}%` }} />
          </div>
        ) : (
          <div className="row" style={{ minHeight: 40 }}>
            <span className="grow small muted">Total bars</span>
            <input type="number" inputMode="numeric" min={1} aria-label="Total bars" value={total} onChange={(e) => setTotal(e.target.value)} style={{ width: 90 }} />
            <Button onClick={() => Number(total) > 0 && void repo.updatePiece(piece.id, { bars: Math.round(Number(total)) })} disabled={!(Number(total) > 0)}>
              Set
            </Button>
          </div>
        )}
        <div className="row" style={{ minHeight: 44 }}>
          <span className="grow small muted">Bars learned</span>
          <input type="number" inputMode="numeric" min={1} aria-label="Bars learned" value={bars} onChange={(e) => setBars(e.target.value)} style={{ width: 90 }} />
          <Button variant="primary" onClick={() => void learned()} disabled={!(Number(bars) > 0)}>
            Learned
          </Button>
        </div>
      </Card>
    </>
  )
}
