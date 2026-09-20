import { useState } from 'react'
import { Link } from 'react-router'
import { consistencyLabel, heatmap, daysWith } from '@/core/consistency/consistency'
import { addDays, formatDay, todayLocal } from '@/core/time/localDay'
import { minutesLabel } from '@/core/ui/format'
import { Heatmap } from '@/core/ui/Heatmap'
import { Button, Card, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '@/app/services'
import { toast } from '@/app/shellStore'
import { FinishSheet } from '../PracticePanel'
import { useBanjoRepo, usePracticeStats } from '../useBanjo'

export function BanjoScreen() {
  const s = useServices()
  const repo = useBanjoRepo()
  const stats = usePracticeStats()
  const [logging, setLogging] = useState<number | null>(null)
  const heat = useQuery(async () => {
    const dayStartHour = await s.settings.get('dayStartHour')
    const today = todayLocal(new Date(), dayStartHour)
    const since = new Date(Date.parse(`${addDays(today, -91)}T00:00:00Z`)).toISOString()
    return heatmap(daysWith(await repo.practiceStamps(since), dayStartHour), today, 12)
  }, ['log_entries', 'settings'])
  const sessions = useQuery(() => repo.sessions(20), ['log_entries'])
  const goals = useQuery(() => repo.goals('active'), ['banjo_goals'])
  const d = stats.data
  return (
    <Screen title="Banjo" right={<Button onClick={() => setLogging(20)}>Log</Button>}>
      <Card>
        <div className="kv">
          <span>Last 7 days</span>
          <span className="pill accent">{d ? consistencyLabel(d.week) : ''}</span>
        </div>
        <div className="kv">
          <span>Last 28 days</span>
          <span className="pill">{d ? consistencyLabel(d.month) : ''}</span>
        </div>
        <div className="kv">
          <span>This week</span>
          <span>{d ? minutesLabel(d.minutesThisWeek) : ''}</span>
        </div>
      </Card>
      <SectionTitle>12 weeks</SectionTitle>
      {heat.data ? <Heatmap weeks={heat.data} label="Practice last 12 weeks" /> : null}
      <div className="tray" style={{ marginTop: 14 }}>
        <Link to="library" className="tile">
          <span className="label">Library</span>
        </Link>
        <Link to="goals" className="tile">
          <span className="label">Goals{goals.data?.length ? ` ${goals.data.length}` : ''}</span>
        </Link>
        <Link to="sessions" className="tile">
          <span className="label">Sessions</span>
        </Link>
      </div>
      <SectionTitle>Recent</SectionTitle>
      {sessions.data && sessions.data.length === 0 ? <EmptyState>No sessions yet</EmptyState> : null}
      <div className="list">
        {(sessions.data ?? []).slice(0, 8).map((e) => (
          <div key={e.id} className="list-row" style={{ minHeight: 44 }}>
            <span className="muted small" style={{ width: 96 }}>
              {formatDay(e.ts.slice(0, 10))}
            </span>
            <span className="grow">{String(e.payload.worked_on ?? '') || 'practice'}</span>
            <span className="pill">{minutesLabel(e.value ?? 0)}</span>
          </div>
        ))}
      </div>
      <FinishSheet
        minutes={logging}
        onClose={() => setLogging(null)}
        lastWorkedOn={String(d?.last?.payload.worked_on ?? '')}
        onSave={async (minutes, worked_on, pieceId) => {
          await repo.logPractice({ minutes, worked_on, piece_id: pieceId })
          toast(`Practice ${minutesLabel(minutes)}`)
        }}
      />
    </Screen>
  )
}
