import { Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from '@/app/shellStore'
import { consistencyLabel } from '@/core/consistency/consistency'
import { Button, SectionTitle } from '@/core/ui/primitives'
import { SleepSheet } from './SleepSheet'
import { TimerSheet } from './TimerSheet'
import { LOG } from './repo'
import { useBrainRepo, useCheckIn, type CheckInData } from './useBrain'

/** Daily check-in on Today: mood, sleep, meditation, stretch, habits. Every log is one tap. */
export function CheckInPanel() {
  const repo = useBrainRepo()
  const q = useCheckIn()
  const [sleepOpen, setSleepOpen] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const d = q.data
  if (!d) return null

  const setMood = (value: number) => void repo.upsertDaily(LOG.mood, d.today, d.dayStartHour, { value, unit: 'score' })
  const saveNote = (note: string) => void repo.upsertDaily(LOG.mood, d.today, d.dayStartHour, { payload: { note } })
  const toggleStretch = async () => {
    if (d.stretch) await repo.logs.remove(d.stretch.id)
    else await repo.upsertDaily(LOG.stretch, d.today, d.dayStartHour, { value: 1 })
  }
  const meditationDone = async (minutes: number) => {
    await repo.logs.add({ type: LOG.meditation, module: 'brain', value: minutes, unit: 'min' })
    toast(`Meditation ${minutes} min`)
  }
  const medMinutes = d.meditation.reduce((n, e) => n + (e.value ?? 0), 0)

  return (
    <div className="card stack" style={{ gap: 10 }}>
      <SectionTitle>Check-in</SectionTitle>
      <Row label="Mood">
        <div className="chips">
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} className={`chip${d.mood?.value === v ? ' on' : ''}`} aria-label={`Mood ${v}`} aria-pressed={d.mood?.value === v} onClick={() => setMood(v)}>
              {v}
            </button>
          ))}
          <button className="chip" onClick={() => setNoteOpen((o) => !o)} aria-label="Mood note">
            {typeof d.mood?.payload.note === 'string' && d.mood.payload.note ? '…' : '+'}
          </button>
        </div>
      </Row>
      {noteOpen ? <input aria-label="Mood note text" defaultValue={String(d.mood?.payload.note ?? '')} placeholder="Note" onBlur={(e) => saveNote(e.target.value)} /> : null}
      {d.drankYesterday ? (
        <Row label="Morning after">
          <div className="chips">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                className={`chip${d.morningAfter?.value === v ? ' on' : ''}`}
                aria-label={`Morning after ${v}`}
                aria-pressed={d.morningAfter?.value === v}
                onClick={() => void repo.upsertDaily('morning_after', d.today, d.dayStartHour, { value: v, unit: 'score', payload: { units_previous_day: d.unitsYesterday } })}
              >
                {v}
              </button>
            ))}
          </div>
        </Row>
      ) : null}
      <Row label="Sleep">
        <Button onClick={() => setSleepOpen(true)}>{d.sleep ? sleepSummary(d) : 'Log'}</Button>
      </Row>
      <Row label="Meditation">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {medMinutes ? <span className="pill accent">{medMinutes} min</span> : null}
          <Button onClick={() => void meditationDone(d.lastMeditationMinutes)}>Done</Button>
          <Button onClick={() => setTimerOpen(true)}>Timer</Button>
        </div>
      </Row>
      <Row label="Stretch">
        <Button variant={d.stretch ? 'primary' : undefined} onClick={() => void toggleStretch()} ariaLabel="Stretch done">
          <Check size={18} aria-hidden /> {d.stretch ? 'Done' : 'Do'}
        </Button>
      </Row>
      {d.habits.map(({ habit, tickedToday, week }) => (
        <Row key={habit.id} label={<Link to={`/m/brain/habit/${habit.id}`}>{habit.name}</Link>}>
          <span className="pill">{consistencyLabel(week)}</span>
          <button className={`check${tickedToday ? ' on' : ''}`} aria-label={`Habit ${habit.name}`} aria-pressed={tickedToday} onClick={() => void repo.toggleHabit(habit.id, d.today, d.dayStartHour)}>
            <Check size={18} aria-hidden />
          </button>
        </Row>
      ))}
      <SleepSheet open={sleepOpen} onClose={() => setSleepOpen(false)} data={d} />
      <TimerSheet open={timerOpen} onClose={() => setTimerOpen(false)} onDone={(m) => void meditationDone(m)} defaultMinutes={d.lastMeditationMinutes} />
    </div>
  )
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="row" style={{ minHeight: 44 }}>
      <span className="grow">{label}</span>
      {children}
    </div>
  )
}

export function sleepSummary(d: CheckInData): string {
  const p = d.sleep?.payload as { bed_at?: string; wake_at?: string; quality?: number } | undefined
  if (!d.sleep || !p) return 'Log'
  const hours = d.sleep.value != null ? `${Math.round(d.sleep.value * 10) / 10}h` : ''
  return [hours, p.quality ? `${p.quality}/5` : ''].filter(Boolean).join(' · ')
}
