import { useState } from 'react'
import { toast } from '@/app/shellStore'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { Button, Card, EmptyState, Screen, SectionTitle, Toggle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { refreshCalendars } from '../runner'
import { timeOf, useChessRepo } from '../useChess'

/** Calendars are Google's per-calendar "Secret address in iCal format" (Calendar settings › Integrate calendar). */
export function CalendarScreen() {
  const repo = useChessRepo()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const cals = useQuery(() => repo.calendars(), ['calendars'])
  const events = useQuery(() => {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    return repo.eventsBetween(from.toISOString(), new Date(from.getTime() + 14 * 86_400_000).toISOString())
  }, ['calendar_events', 'calendars'])
  const refresh = async () => {
    setBusy(true)
    const s = await refreshCalendars()
    setBusy(false)
    toast(s.errors.length ? s.errors.join('; ') : `${s.events} events from ${s.calendars} ${s.calendars === 1 ? 'calendar' : 'calendars'}`)
  }
  const add = async () => {
    if (!url.trim()) return
    await repo.addCalendar(name || 'Lessons', url)
    setName('')
    setUrl('')
    await refresh()
  }
  const today = calendarDay()
  const byDay = new Map<string, typeof events.data>()
  for (const e of events.data ?? []) {
    const d = calendarDay(new Date(e.start_ts))
    byDay.set(d, [...(byDay.get(d) ?? []), e])
  }
  return (
    <Screen
      title="Calendar"
      right={
        <Button onClick={() => void refresh()} disabled={busy}>
          Refresh
        </Button>
      }
    >
      <div className="list">
        {(cals.data ?? []).map((c) => (
          <div key={c.id} className="list-row">
            <div className="grow">
              <div className="title">{c.name}</div>
              <div className="sub">{c.last_error ? `error: ${c.last_error}` : c.last_synced_at ? `synced ${new Date(c.last_synced_at).toLocaleString('en-GB')}` : 'not synced yet'}</div>
            </div>
            <Toggle label={`Enable ${c.name}`} checked={!!c.enabled} onChange={(on) => void repo.updateCalendar(c.id, { enabled: on ? 1 : 0 })} />
            <Button ariaLabel={`Remove ${c.name}`} onClick={() => void repo.removeCalendar(c.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <Card>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <input aria-label="Calendar name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input aria-label="iCal address" placeholder="Secret address in iCal format" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
          <div className="muted small">Google Calendar › Settings › the calendar › Integrate calendar › Secret address in iCal format</div>
          <Button type="submit" variant="primary" disabled={!url.trim()}>
            Add calendar
          </Button>
        </form>
      </Card>
      <SectionTitle>Next 14 days</SectionTitle>
      {events.data && events.data.length === 0 ? <EmptyState>Nothing</EmptyState> : null}
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day}>
          <div className="muted small" style={{ marginTop: 8 }}>
            {day === today ? 'Today' : formatDay(day)}
          </div>
          <div className="list">
            {(list ?? []).map((e) => (
              <div key={e.id} className="list-row" style={{ minHeight: 44 }}>
                <span className="muted small" style={{ width: 52 }}>
                  {e.all_day ? 'all day' : timeOf(e.start_ts)}
                </span>
                <span className="grow">{e.summary}</span>
                {e.location ? <span className="muted small">{e.location}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </Screen>
  )
}
