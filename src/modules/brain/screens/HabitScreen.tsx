import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useServices } from '@/app/services'
import { consistency, consistencyLabel, daysWith, heatmap } from '@/core/consistency/consistency'
import { addDays, formatDay, lastNDays, todayLocal, type LocalDay } from '@/core/time/localDay'
import { Heatmap } from '@/core/ui/Heatmap'
import { Button, Card, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { LOG } from '../repo'
import { useBrainRepo } from '../useBrain'

export function HabitScreen() {
  const { id = '' } = useParams()
  const s = useServices()
  const repo = useBrainRepo()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const q = useQuery(
    async () => {
      const habit = await repo.getHabit(id)
      if (!habit) return null
      const dayStartHour = await s.settings.get('dayStartHour')
      const today = todayLocal(new Date(), dayStartHour)
      const since = new Date(Date.parse(`${addDays(today, -91)}T00:00:00Z`)).toISOString()
      const days = daysWith(await repo.stampsFor(LOG.habit, since, habit.id), dayStartHour)
      return { habit, today, dayStartHour, days, week: consistency(days, today, 7, habit.target_per_week), month: consistency(days, today, 28, habit.target_per_week), weeks: heatmap(days, today, 12) }
    },
    ['log_entries', 'habits', 'settings'],
    [id],
  )
  const d = q.data
  if (!d) return <Screen title="Habit">{q.loading ? null : <div className="empty">Not found</div>}</Screen>
  const { habit } = d
  return (
    <Screen title={habit.name} right={<Button onClick={() => setEditing((e) => !e)}>Edit</Button>}>
      <Card>
        <div className="kv">
          <span>Last 7 days</span>
          <span className={`pill${d.week.targetMet ? ' accent' : ''}`}>{consistencyLabel(d.week)}</span>
        </div>
        <div className="kv">
          <span>Last 28 days</span>
          <span className="pill">{consistencyLabel(d.month)}</span>
        </div>
        <div className="kv">
          <span>Target</span>
          <span className="muted">{habit.target_per_week}/week</span>
        </div>
      </Card>
      <SectionTitle>12 weeks</SectionTitle>
      <Heatmap weeks={d.weeks} label={`${habit.name} last 12 weeks`} />
      <SectionTitle>Fill in a day</SectionTitle>
      <div className="chips">
        {lastNDays(d.today, 14).map((day: LocalDay) => {
          const on = d.days.has(day)
          return (
            <button key={day} className={`chip${on ? ' on' : ''}`} aria-pressed={on} aria-label={`${habit.name} ${formatDay(day)}`} onClick={() => void repo.toggleHabit(habit.id, day, d.dayStartHour)}>
              {Number(day.slice(8))}
            </button>
          )
        })}
      </div>
      {editing ? (
        <Card style={{ marginTop: 14 }}>
          <div className="stack">
            <input aria-label="Habit name" defaultValue={habit.name} onBlur={(e) => void repo.updateHabit(habit.id, { name: e.target.value.trim() || habit.name })} />
            <input type="number" aria-label="Target per week" min={1} max={7} defaultValue={habit.target_per_week} onBlur={(e) => void repo.updateHabit(habit.id, { target_per_week: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })} />
            <Button
              variant="danger"
              onClick={() => {
                void repo.updateHabit(habit.id, { archived_at: new Date().toISOString() })
                navigate('/m/brain')
              }}
            >
              Archive
            </Button>
          </div>
        </Card>
      ) : null}
    </Screen>
  )
}
