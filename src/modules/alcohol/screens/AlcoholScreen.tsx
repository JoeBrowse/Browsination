import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { formatDay } from '@/core/time/localDay'
import { Button, Card, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { BacChart } from '../Chart'
import { CaffeineCard } from '../CaffeineCard'
import { CaffeineSheet } from '../CaffeineSheet'
import { DrinkSheet } from '../DrinkSheet'
import { caffeineCurve } from '../caffeine'
import { DISCLAIMER, nextWallClock } from '../forecast'
import { curve, summarise, unitsFromGrams, WEEKLY_GUIDELINE_UNITS } from '../model'
import { fmtTime, useAlcoholRepo, useAlcoholSettings, weekAgoIso } from '../useAlcohol'

export function AlcoholScreen() {
  const repo = useAlcoholRepo()
  const settings = useAlcoholSettings()
  const [drinkOpen, setDrinkOpen] = useState(false)
  const [coffeeOpen, setCoffeeOpen] = useState(false)
  const q = useQuery(async () => {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 3_600_000).toISOString()
    return {
      drinks: await repo.drinksSince(dayAgo),
      recent: await repo.drinksBetween(weekAgoIso(now), now.toISOString()),
      weekGrams: await repo.gramsBetween(weekAgoIso(now), now.toISOString()),
      doses: await repo.dosesSince(dayAgo),
      caffeineToday: await repo.caffeineBetween(dayAgo, now.toISOString()),
    }
  }, ['log_entries'])
  const d = q.data
  const est = useMemo(() => {
    if (!d || !settings.data) return null
    const now = Date.now()
    const pts = curve(d.drinks, settings.data.person, settings.data.params, now - 6 * 3_600_000, now + 12 * 3_600_000, 1)
    const bed = nextWallClock(settings.data.usualBedtime, now)
    const caff = caffeineCurve(d.doses, now, bed, settings.data.caffeineHalfLifeHours, 30)
    return { pts, s: summarise(pts, now), bed, caffeineAtBed: caff[caff.length - 1]?.mg ?? 0 }
  }, [d, settings.data])
  const weekUnits = unitsFromGrams(d?.weekGrams ?? 0)
  return (
    <Screen
      title="Drinks"
      right={
        <Button variant="primary" onClick={() => setDrinkOpen(true)}>
          Drink
        </Button>
      }
    >
      <Card>
        <div className="kv">
          <span>Now</span>
          <span className="pill accent">{est ? `~${est.s.bacNow.toFixed(2)} g/L` : '–'}</span>
        </div>
        {est && est.s.zeroAtMs && est.s.bacNow > 0.01 ? (
          <div className="kv small">
            <span className="muted">Back to zero</span>
            <span>{fmtTime(est.s.zeroAtMs)}</span>
          </div>
        ) : null}
        {est && d && d.drinks.length ? <BacChart withCurve={est.pts} withoutCurve={[]} nowMs={Date.now()} bedtimeMs={est.bed} label="Estimated blood alcohol, last 6 hours and next 12" /> : null}
        <div className="kv">
          <span>This week</span>
          <span className={`pill${weekUnits > WEEKLY_GUIDELINE_UNITS ? ' accent' : ''}`}>
            {weekUnits.toFixed(1)} of {WEEKLY_GUIDELINE_UNITS} units
          </span>
        </div>
        <div className="week-bar" aria-hidden>
          <div style={{ width: `${Math.min(100, (weekUnits / WEEKLY_GUIDELINE_UNITS) * 100)}%` }} />
        </div>
      </Card>
      <SectionTitle>Caffeine</SectionTitle>
      <CaffeineCard onOther={() => setCoffeeOpen(true)} />
      <div className="tray" style={{ marginTop: 14 }}>
        <Link to="medication" className="tile">
          <span className="label">Medication</span>
        </Link>
      </div>
      {est && est.caffeineAtBed >= 1 ? <div className="muted small" style={{ marginTop: 10 }}>About {Math.round(est.caffeineAtBed)} mg still active at bedtime</div> : null}
      <SectionTitle>Last 7 days</SectionTitle>
      {d && d.recent.length === 0 ? <EmptyState>No drinks logged</EmptyState> : null}
      <div className="list">
        {[...(d?.recent ?? [])].reverse().map((e) => (
          <div key={e.id} className="list-row" style={{ minHeight: 44 }}>
            <span className="muted small" style={{ width: 96 }}>
              {formatDay(e.ts.slice(0, 10))} {fmtTime(Date.parse(e.ts))}
            </span>
            <span className="grow">{String(e.payload.name ?? 'Drink')}</span>
            <span className="pill">{Number(e.payload.units ?? 0).toFixed(1)}</span>
            <Button ariaLabel="Remove drink" onClick={() => void repo.logs.remove(e.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <div className="muted small" style={{ marginTop: 16 }}>
        {DISCLAIMER}
      </div>
      <DrinkSheet open={drinkOpen} onClose={() => setDrinkOpen(false)} />
      <CaffeineSheet open={coffeeOpen} onClose={() => setCoffeeOpen(false)} />
    </Screen>
  )
}
