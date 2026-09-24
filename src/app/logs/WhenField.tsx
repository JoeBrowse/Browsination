import { calendarDay, localTimeOf, stampAt, stampNow } from '@/core/time/localDay'

export interface When {
  day: string
  /** 'HH:MM'. */
  time: string
}

export const whenNow = (now: Date = new Date()): When => ({ day: calendarDay(now), time: localTimeOf(now.toISOString(), -now.getTimezoneOffset()) })

export const whenOf = (e: { ts: string; tz_offset_min: number }): When => ({ day: localDay(e), time: localTimeOf(e.ts, e.tz_offset_min) })

const localDay = (e: { ts: string; tz_offset_min: number }) => new Date(Date.parse(e.ts) + e.tz_offset_min * 60_000).toISOString().slice(0, 10)

/** The instant and offset to store for a chosen wall clock. */
export const stampOf = (w: When) => stampAt(w.day, w.time)

export const isNow = (w: When, now: Date = new Date()) => Math.abs(Date.parse(stampOf(w).ts) - now.getTime()) < 120_000

/** When it happened. Defaults to now; two taps to put it on an earlier day. */
export function WhenField({ value, onChange, label = 'When' }: { value: When; onChange: (w: When) => void; label?: string }) {
  const shift = (n: number) => {
    const d = new Date(`${value.day}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + n)
    onChange({ ...value, day: d.toISOString().slice(0, 10) })
  }
  return (
    <div className="stack" role="group" aria-label={label}>
      <div className="row">
        <input type="date" aria-label={`${label} date`} value={value.day} max={calendarDay()} onChange={(e) => onChange({ ...value, day: e.target.value || calendarDay() })} />
        <input type="time" aria-label={`${label} time`} value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value || '12:00' })} style={{ width: 120 }} />
      </div>
      <div className="btn-row">
        <button type="button" className="pill" onClick={() => shift(-1)}>
          Day back
        </button>
        <button type="button" className="pill" onClick={() => shift(1)} disabled={value.day >= calendarDay()}>
          Day on
        </button>
        <button type="button" className="pill" onClick={() => onChange(whenNow())}>
          Now
        </button>
      </div>
    </div>
  )
}

/** Stamp for a time that may have been edited; identical to a live write when it was not. */
export const stampFor = (w: When | null): { ts: string; tz_offset_min: number } => (w ? stampOf(w) : stampNow())

/** "Earlier" reveals the date and time; null means now, so a normal log stays one tap. */
export function WhenToggle({ value, onChange, label = 'Earlier' }: { value: When | null; onChange: (w: When | null) => void; label?: string }) {
  if (!value)
    return (
      <button type="button" className="pill" onClick={() => onChange(whenNow())}>
        {label}
      </button>
    )
  return (
    <div className="stack">
      <WhenField value={value} onChange={onChange} />
      <button type="button" className="pill" onClick={() => onChange(null)}>
        Now
      </button>
    </div>
  )
}
