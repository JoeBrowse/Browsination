import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { Button, Card, Screen, SectionTitle } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import type { LessonRow } from '../repo'
import { timeOf, useChessRepo } from '../useChess'

export function StudentScreen() {
  const { id = '' } = useParams()
  const repo = useChessRepo()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<LessonRow | null>(null)
  const q = useQuery(async () => ({ student: await repo.student(id), lessons: await repo.lessons(id) }), ['students', 'people', 'lessons'], [id])
  const s = q.data?.student
  if (!s) return <Screen title="Student">{q.loading ? null : <div className="empty">Not found</div>}</Screen>
  const update = (patch: Parameters<typeof repo.updateStudent>[1]) => void repo.updateStudent(s.id, patch)
  return (
    <Screen title={s.name} right={<Button onClick={() => setAdding(true)}>Lesson</Button>}>
      <Card>
        <div className="stack" style={{ gap: 8 }}>
          <input aria-label="Level" placeholder="Level / rating" defaultValue={s.level} onBlur={(e) => update({ level: e.target.value })} />
          <input aria-label="Goals" placeholder="Goals" defaultValue={s.goals} onBlur={(e) => update({ goals: e.target.value })} />
          <textarea aria-label="Student notes" placeholder="Notes" defaultValue={s.notes} onBlur={(e) => update({ notes: e.target.value })} />
        </div>
      </Card>
      <SectionTitle>Lessons</SectionTitle>
      <div className="list">
        {(q.data?.lessons ?? []).map((l) => (
          <button key={l.id} className="list-row" onClick={() => setOpen(l)}>
            <div className="grow">
              <div className="title">{formatDay(l.date)}</div>
              <div className="sub">{[l.plan.split('\n')[0], l.notes_after ? 'notes ✓' : null].filter(Boolean).join(' · ') || 'no plan yet'}</div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <Button
          variant="danger"
          onClick={() => {
            update({ active: 0 })
            navigate('/m/chess/students')
          }}
        >
          Archive student
        </Button>
      </div>
      <NewLessonSheet studentId={s.id} open={adding} onClose={() => setAdding(false)} />
      <LessonSheet lesson={open} onClose={() => setOpen(null)} />
    </Screen>
  )
}

function NewLessonSheet({ studentId, open, onClose }: { studentId: string; open: boolean; onClose: () => void }) {
  const repo = useChessRepo()
  const [date, setDate] = useState(calendarDay())
  const [plan, setPlan] = useState('')
  const [eventId, setEventId] = useState('')
  const templates = useQuery(() => repo.templates(), ['lesson_templates'])
  const events = useQuery(() => {
    const from = new Date()
    from.setDate(from.getDate() - 7)
    return repo.eventsBetween(from.toISOString(), new Date(from.getTime() + 21 * 86_400_000).toISOString())
  }, ['calendar_events'])
  const save = async () => {
    await repo.addLesson({ student_id: studentId, date, plan, event_id: eventId || null })
    setPlan('')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="New lesson">
      <div className="stack">
        <input type="date" aria-label="Lesson date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select aria-label="Calendar event" value={eventId} onChange={(e) => { setEventId(e.target.value); const ev = events.data?.find((x) => x.id === e.target.value); if (ev) setDate(calendarDay(new Date(ev.start_ts))) }}>
          <option value="">No calendar event</option>
          {(events.data ?? []).map((ev) => (
            <option key={ev.id} value={ev.id}>
              {formatDay(calendarDay(new Date(ev.start_ts)))} {ev.all_day ? '' : timeOf(ev.start_ts)} {ev.summary}
            </option>
          ))}
        </select>
        {(templates.data ?? []).length ? (
          <div className="chips" role="group" aria-label="Templates">
            {(templates.data ?? []).map((t) => (
              <button key={t.id} type="button" className="chip" onClick={() => setPlan((p) => (p ? `${p}\n${t.body}` : t.body))}>
                {t.title}
              </button>
            ))}
          </div>
        ) : null}
        <textarea aria-label="Plan" placeholder="Plan" value={plan} onChange={(e) => setPlan(e.target.value)} />
        <Button variant="primary" block onClick={() => void save()}>
          Save
        </Button>
      </div>
    </Sheet>
  )
}

function LessonSheet({ lesson, onClose }: { lesson: LessonRow | null; onClose: () => void }) {
  const repo = useChessRepo()
  return (
    <Sheet open={lesson !== null} onClose={onClose} title={lesson ? formatDay(lesson.date) : ''}>
      {lesson ? (
        <div className="stack" key={lesson.id}>
          <div className="small muted">Plan</div>
          <textarea aria-label="Lesson plan" defaultValue={lesson.plan} onBlur={(e) => void repo.updateLesson(lesson.id, { plan: e.target.value })} />
          <div className="small muted">After the lesson</div>
          <textarea aria-label="Lesson notes" placeholder="What happened, what next" defaultValue={lesson.notes_after} onBlur={(e) => void repo.updateLesson(lesson.id, { notes_after: e.target.value })} />
          <div className="btn-row">
            <Button onClick={onClose}>Close</Button>
            <Button
              variant="danger"
              onClick={() => {
                void repo.removeLesson(lesson.id)
                onClose()
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  )
}
