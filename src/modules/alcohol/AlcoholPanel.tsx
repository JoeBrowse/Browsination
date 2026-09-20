import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useServices } from '@/app/services'
import { toast } from '@/app/shellStore'
import { logDayRange, todayLocal } from '@/core/time/localDay'
import { Button, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { CaffeineSheet } from './CaffeineSheet'
import { DrinkSheet } from './DrinkSheet'
import { curve, summarise, unitsFromGrams } from './model'
import type { DrinkSpec } from './presets'
import { useAlcoholRepo, useAlcoholSettings } from './useAlcohol'

/** Today panel: same-as-last-time drink and caffeine in one tap, current estimate, medication ticks. */
export function AlcoholPanel() {
  const s = useServices()
  const repo = useAlcoholRepo()
  const settings = useAlcoholSettings()
  const [drinkOpen, setDrinkOpen] = useState(false)
  const [coffeeOpen, setCoffeeOpen] = useState(false)
  const q = useQuery(
    async () => {
      const dayStartHour = await s.settings.get('dayStartHour')
      const today = todayLocal(new Date(), dayStartHour)
      const r = logDayRange(today, dayStartHour)
      const [last, lastCoffee, todayGrams, drinks, meds, taken] = await Promise.all([
        repo.lastDrink(),
        repo.lastCaffeine(),
        repo.gramsBetween(r.from, r.to),
        repo.drinksSince(new Date(Date.now() - 24 * 3_600_000).toISOString()),
        repo.medications(),
        repo.medicationLogsBetween(r.from, r.to),
      ])
      return { last, lastCoffee, todayGrams, drinks, meds, taken: new Set(taken.map((t) => t.entity_id)) }
    },
    ['log_entries', 'medications', 'settings'],
  )
  const d = q.data
  const bacNow = useMemo(() => {
    if (!d || !settings.data || d.drinks.length === 0) return 0
    const now = Date.now()
    return summarise(curve(d.drinks, settings.data.person, settings.data.params, now - 60_000, now, 1), now).bacNow
  }, [d, settings.data])
  const lastSpec: DrinkSpec | null = d?.last ? { preset: String(d.last.payload.preset ?? 'custom'), name: String(d.last.payload.name ?? ''), volumeMl: Number(d.last.payload.volume_ml ?? 0), abv: Number(d.last.payload.abv ?? 0) } : null
  const lastCoffee = d?.lastCoffee ? { preset: String(d.lastCoffee.payload.preset ?? 'custom'), name: String(d.lastCoffee.payload.name ?? 'Caffeine'), mg: d.lastCoffee.value ?? 0 } : null
  return (
    <div className="card stack" style={{ gap: 10 }}>
      <SectionTitle>
        <Link to="/m/alcohol">Drinks</Link>
        {d && d.todayGrams > 0 ? <span className="pill">{unitsFromGrams(d.todayGrams).toFixed(1)} units today</span> : null}
        {bacNow > 0.01 ? <span className="pill accent">~{bacNow.toFixed(2)} g/L</span> : null}
      </SectionTitle>
      <div className="row" style={{ minHeight: 44 }}>
        <span className="grow">Drink</span>
        {lastSpec ? (
          <Button
            onClick={() => {
              void repo.logDrink(lastSpec).then(() => toast(`${lastSpec.name} again`))
            }}
          >
            {lastSpec.name || 'Same again'}
          </Button>
        ) : null}
        <Button variant="primary" onClick={() => setDrinkOpen(true)}>
          {lastSpec ? 'Other' : 'Log'}
        </Button>
      </div>
      <div className="row" style={{ minHeight: 44 }}>
        <span className="grow">Caffeine</span>
        {lastCoffee ? (
          <Button
            onClick={() => {
              void repo.logCaffeine(lastCoffee.mg, lastCoffee.preset, lastCoffee.name).then(() => toast(`${lastCoffee.name} again`))
            }}
          >
            {lastCoffee.name}
          </Button>
        ) : null}
        <Button onClick={() => setCoffeeOpen(true)}>{lastCoffee ? 'Other' : 'Log'}</Button>
      </div>
      {(d?.meds ?? []).map((m) => (
        <div key={m.id} className="row" style={{ minHeight: 44 }}>
          <span className="grow">
            {m.name} <span className="muted small">{m.dose}</span>
          </span>
          <button className={`check${d?.taken.has(m.id) ? ' on' : ''}`} aria-label={`Taken ${m.name}`} aria-pressed={d?.taken.has(m.id)} onClick={() => void repo.logMedication(m)}>
            <Check size={18} aria-hidden />
          </button>
        </div>
      ))}
      <DrinkSheet open={drinkOpen} onClose={() => setDrinkOpen(false)} initial={lastSpec} />
      <CaffeineSheet open={coffeeOpen} onClose={() => setCoffeeOpen(false)} initial={lastCoffee} />
    </div>
  )
}
