import { useEffect, useMemo, useState } from 'react'
import { stampOf, WhenField, whenNow, whenOf, type When } from '@/app/logs/WhenField'
import { toast } from '@/app/shellStore'
import type { LogEntry } from '@/core/repos/logEntries'
import { calendarDay } from '@/core/time/localDay'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { BacChart } from './Chart'
import { DISCLAIMER, forecast } from './forecast'
import { DRINK_PRESETS, describeDrink, drinkMeasures, type DrinkSpec } from './presets'
import { fmtTime, useAlcoholRepo, useAlcoholSettings, weekAgoIso } from './useAlcohol'

const DEFAULT: DrinkSpec = { preset: 'pint', name: 'Pint', volumeMl: 568, abv: 4.5 }

/** The measure a logged drink was: what the payload recorded, whatever the presets say now. */
const specOf = (e: LogEntry): DrinkSpec => ({ preset: String(e.payload.preset ?? 'custom'), name: String(e.payload.name ?? ''), volumeMl: Number(e.payload.volume_ml ?? 0), abv: Number(e.payload.abv ?? 0) })

/** Pick a drink, see the forecast with and without it, then confirm. Also edits one already logged. */
export function DrinkSheet({ open, onClose, initial, entry }: { open: boolean; onClose: () => void; initial?: DrinkSpec | null; entry?: LogEntry | null }) {
  const repo = useAlcoholRepo()
  const settings = useAlcoholSettings()
  const [spec, setSpec] = useState<DrinkSpec>(entry ? specOf(entry) : (initial ?? DEFAULT))
  const [when, setWhen] = useState<When>(entry ? whenOf(entry) : whenNow())
  useEffect(() => {
    if (open) {
      setSpec(entry ? specOf(entry) : (initial ?? DEFAULT))
      setWhen(entry ? whenOf(entry) : whenNow())
    }
  }, [open, initial, entry])
  const state = useQuery(async () => {
    const now = new Date()
    return { existing: await repo.drinksSince(new Date(now.getTime() - 24 * 3_600_000).toISOString()), weekGrams: await repo.gramsBetween(weekAgoIso(now), now.toISOString()) }
  }, ['log_entries'])

  const atMs = useMemo(() => Date.parse(stampOf(when).ts), [when])
  // the forecast is about tonight, so it is only shown for a drink being logged now
  const showForecast = when.day === calendarDay() && !entry
  const m = drinkMeasures(spec)
  const f = useMemo(() => {
    if (!settings.data || !state.data || !showForecast) return null
    const nowMs = Date.now()
    return forecast({ existing: state.data.existing, candidate: { atMs, grams: m.grams }, person: settings.data.person, params: settings.data.params, nowMs, usualBedtime: settings.data.usualBedtime, usualSleepHours: settings.data.usualSleepHours, weekGramsSoFar: state.data.weekGrams })
  }, [settings.data, state.data, atMs, m.grams, showForecast])

  const pick = (key: string) => {
    const p = DRINK_PRESETS.find((x) => x.key === key)!
    setSpec({ preset: p.key, name: p.label, volumeMl: p.volumeMl, abv: p.abv })
  }
  const confirm = async () => {
    const stamp = stampOf(when)
    if (entry) await repo.updateDrink(entry.id, spec, stamp)
    else await repo.logDrink(spec, stamp.ts)
    toast(`${describeDrink(spec)} · ${m.units} units`)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Drink">
      <div className="stack">
        <div className="chips" role="group" aria-label="Drink presets">
          {DRINK_PRESETS.map((p) => (
            <button key={p.key} className={`chip${spec.preset === p.key ? ' on' : ''}`} aria-pressed={spec.preset === p.key} onClick={() => pick(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="row">
          <label className="grow small muted">
            ml
            <input type="number" inputMode="decimal" aria-label="Volume ml" value={spec.volumeMl} onChange={(e) => setSpec({ ...spec, volumeMl: Number(e.target.value) || 0 })} />
          </label>
          <label className="grow small muted">
            ABV %
            <input type="number" inputMode="decimal" step="0.1" aria-label="ABV" value={spec.abv} onChange={(e) => setSpec({ ...spec, abv: Number(e.target.value) || 0 })} />
          </label>
        </div>
        <WhenField value={when} onChange={setWhen} />
        <div className="kv">
          <span>{m.units} units · {m.grams} g</span>
          {f ? <span className="pill">{f.session.units.toFixed(1)} units tonight</span> : null}
        </div>
        {f ? (
          <>
            <BacChart withCurve={f.with} withoutCurve={f.without} nowMs={Date.now()} bedtimeMs={f.sleep.bedtimeMs} label="Estimated blood alcohol with and without this drink" />
            <div className="kv small">
              <span className="muted">Peak</span>
              <span>{f.peak ? `${f.peak.bac.toFixed(2)} g/L at ${fmtTime(f.peak.atMs)}` : '–'}</span>
            </div>
            <div className="kv small">
              <span className="muted">Back to zero</span>
              <span>{f.zeroAtMs ? fmtTime(f.zeroAtMs) : 'not within 20h'}</span>
            </div>
            {f.timeline.map((l) => (
              <div key={l.atMs + l.text} className="small">
                {l.text}
              </div>
            ))}
            <div className="small">{f.sleep.text}</div>
            <div className="small">{f.morning.text}</div>
            <div className="kv small">
              <span className="muted">This week</span>
              <span className={f.week.units > f.week.guideline ? 'pill' : ''}>
                {f.week.units.toFixed(1)} of {f.week.guideline} units
              </span>
            </div>
          </>
        ) : null}
        <div className="muted small">{DISCLAIMER}</div>
        <div className="btn-row">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void confirm()} disabled={m.grams <= 0}>
            {entry ? 'Save' : 'Log it'}
          </Button>
          {entry ? (
            <Button
              variant="danger"
              onClick={() => {
                void repo.logs.remove(entry.id)
                onClose()
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    </Sheet>
  )
}
