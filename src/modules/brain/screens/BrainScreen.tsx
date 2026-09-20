import { useState } from 'react'
import { Link } from 'react-router'
import { useServices } from '@/app/services'
import { consistencyLabel } from '@/core/consistency/consistency'
import { addDays, formatDay, todayLocal } from '@/core/time/localDay'
import { Button, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { LOG } from '../repo'
import { useBrainRepo, useCheckIn } from '../useBrain'

export function BrainScreen() {
  const repo = useBrainRepo()
  const checkIn = useCheckIn()
  const [name, setName] = useState('')
  const [target, setTarget] = useState(7)
  const add = async () => {
    if (!name.trim()) return
    await repo.createHabit(name, target)
    setName('')
  }
  return (
    <Screen title="Brain">
      <SectionTitle>Habits</SectionTitle>
      <div className="list">
        {(checkIn.data?.habits ?? []).map(({ habit, week }) => (
          <Link key={habit.id} to={`/m/brain/habit/${habit.id}`} className="list-row">
            <div className="grow">
              <div className="title">{habit.name}</div>
              <div className="sub">target {habit.target_per_week}/week</div>
            </div>
            <span className={`pill${week.targetMet ? ' accent' : ''}`}>{consistencyLabel(week)}</span>
          </Link>
        ))}
        {checkIn.data && checkIn.data.habits.length === 0 ? <EmptyState>No habits yet</EmptyState> : null}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <input aria-label="New habit" placeholder="New habit" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" aria-label="Target per week" min={1} max={7} value={target} style={{ width: 72 }} onChange={(e) => setTarget(Math.min(7, Math.max(1, Number(e.target.value) || 1)))} />
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Add
        </Button>
      </form>
      <SectionTitle>Last 14 days</SectionTitle>
      <History />
    </Screen>
  )
}

function History() {
  const s = useServices()
  const repo = useBrainRepo()
  const q = useQuery(
    async () => {
      const dayStartHour = await s.settings.get('dayStartHour')
      const today = todayLocal(new Date(), dayStartHour)
      const rows: { day: string; mood: number | null; sleep: number | null; med: number; stretch: boolean }[] = []
      for (let i = 0; i < 14; i++) {
        const day = addDays(today, -i)
        const [mood, sleep, med, stretch] = await Promise.all([
          repo.entriesOn(LOG.mood, day, dayStartHour),
          repo.entriesOn(LOG.sleep, day, dayStartHour),
          repo.entriesOn(LOG.meditation, day, dayStartHour),
          repo.entriesOn(LOG.stretch, day, dayStartHour),
        ])
        rows.push({ day, mood: mood[0]?.value ?? null, sleep: sleep[0]?.value ?? null, med: med.reduce((n, e) => n + (e.value ?? 0), 0), stretch: stretch.length > 0 })
      }
      return rows
    },
    ['log_entries', 'settings'],
  )
  return (
    <div className="list">
      {(q.data ?? []).map((r) => (
        <div key={r.day} className="list-row" style={{ minHeight: 40 }}>
          <span className="grow small">{formatDay(r.day)}</span>
          <span className="pill">{r.mood != null ? `mood ${r.mood}` : '–'}</span>
          <span className="pill">{r.sleep != null ? `${r.sleep}h` : '–'}</span>
          <span className="pill">{r.med ? `${r.med}m` : '–'}</span>
          <span className="pill">{r.stretch ? 'stretch' : '–'}</span>
        </div>
      ))}
    </div>
  )
}
