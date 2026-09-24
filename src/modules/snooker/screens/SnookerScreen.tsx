import { useState } from 'react'
import { Link } from 'react-router'
import { stampFor, WhenToggle, type When } from '@/app/logs/WhenField'
import { useServices } from '@/app/services'
import { toast } from '@/app/shellStore'
import { consistency, consistencyLabel, daysWith } from '@/core/consistency/consistency'
import { addDays, formatDay, todayLocal } from '@/core/time/localDay'
import { Button, Card, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { routineStats } from '../logic'
import { useSnookerRepo } from '../useSnooker'

export function SnookerScreen() {
  const s = useServices()
  const repo = useSnookerRepo()
  const [name, setName] = useState('')
  const [breakOpen, setBreakOpen] = useState(false)
  const q = useQuery(
    async () => {
      const dayStartHour = await s.settings.get('dayStartHour')
      const today = todayLocal(new Date(), dayStartHour)
      const since = new Date(Date.parse(`${addDays(today, -8)}T00:00:00Z`)).toISOString()
      const routines = await repo.routines()
      const stats = await Promise.all(routines.map(async (r) => ({ routine: r, stats: routineStats(await repo.attemptValues(r.id)) })))
      return { highest: await repo.highestBreak(), breaks: await repo.recentBreaks(5), week: consistency(daysWith(await repo.practiceStamps(since), dayStartHour), today, 7), stats }
    },
    ['log_entries', 'snooker_routines', 'settings'],
  )
  const d = q.data
  return (
    <Screen title="Snooker" right={<Button variant="primary" onClick={() => setBreakOpen(true)}>Break</Button>}>
      <Card>
        <div className="kv">
          <span>Highest break</span>
          <span className="pill accent" style={{ fontSize: 18 }}>
            {d?.highest ?? '–'}
          </span>
        </div>
        <div className="kv">
          <span>Practised, last 7 days</span>
          <span className="pill">{d ? consistencyLabel(d.week) : ''}</span>
        </div>
        {d?.breaks.length ? <div className="muted small">Recent breaks: {d.breaks.map((b) => b.value).join(', ')}</div> : null}
      </Card>
      <div className="tray" style={{ marginTop: 14 }}>
        <Link to="league" className="tile">
          <span className="label">League</span>
        </Link>
      </div>
      <SectionTitle>Routines</SectionTitle>
      {d && d.stats.length === 0 ? <EmptyState>No routines yet</EmptyState> : null}
      <div className="list">
        {(d?.stats ?? []).map(({ routine, stats }) => (
          <Link key={routine.id} to={`routine/${routine.id}`} className="list-row">
            <div className="grow">
              <div className="title">{routine.name}</div>
              <div className="sub">{stats.count ? `best ${stats.best} · recent ${stats.recentAvg} · ${stats.count} attempts` : 'no attempts yet'}</div>
            </div>
          </Link>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          void repo.addRoutine(name)
          setName('')
        }}
      >
        <input aria-label="New routine" placeholder="New routine (e.g. line-up)" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={!name.trim()}>
          Add
        </Button>
      </form>
      <BreakSheet open={breakOpen} onClose={() => setBreakOpen(false)} highest={d?.highest ?? null} />
    </Screen>
  )
}

function BreakSheet({ open, onClose, highest }: { open: boolean; onClose: () => void; highest: number | null }) {
  const repo = useSnookerRepo()
  const [points, setPoints] = useState('')
  const [when, setWhen] = useState<When | null>(null)
  const save = async () => {
    const n = Number(points)
    if (!Number.isFinite(n) || n <= 0) return
    await repo.logBreak(Math.round(n), '', stampFor(when).ts)
    toast(highest !== null && n > highest ? `New highest break: ${n}` : `Break ${n}`)
    setPoints('')
    setWhen(null)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Log a break">
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <input type="number" inputMode="numeric" aria-label="Break points" placeholder="Points" min={1} max={147} value={points} onChange={(e) => setPoints(e.target.value)} />
        {when ? null : <div className="muted small">{formatDay(new Date().toISOString().slice(0, 10))}</div>}
        <WhenToggle value={when} onChange={setWhen} />
        <Button type="submit" variant="primary" block disabled={!points}>
          Save
        </Button>
      </form>
    </Sheet>
  )
}
