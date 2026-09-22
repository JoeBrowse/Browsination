import { Chips } from '@/app/tasks/fields'
import { CAFFEINE_PRESETS } from './caffeine'
import { useServices } from '@/app/services'
import type { Settings } from '@/core/settings/schema'
import { Card, Toggle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { DISCLAIMER } from './forecast'

/** Body and model parameters. Every value is a rough population default until changed. */
export function AlcoholSettings() {
  const s = useServices()
  const q = useQuery(() => s.settings.all(), ['settings'])
  const v = q.data
  if (!v) return null
  const set = <K extends keyof Settings>(k: K, value: Settings[K]) => void s.settings.set(k, value)
  const num = (k: keyof Settings, label: string, step: string, min: number, max: number) => (
    <div className="row">
      <span className="grow">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        aria-label={label}
        style={{ width: 110 }}
        defaultValue={String(v[k])}
        onBlur={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n) && n >= min && n <= max) set(k, n as never)
        }}
      />
    </div>
  )
  return (
    <Card>
      <div className="stack" style={{ gap: 10 }}>
        {num('alcohol.weightKg', 'Weight (kg)', '0.5', 30, 250)}
        <div className="row">
          <span className="grow">Sex</span>
          <Chips
            label="Sex"
            value={v['alcohol.sex']}
            onChange={(x) => set('alcohol.sex', x)}
            options={[
              { label: 'Male', value: 'male' as Settings['alcohol.sex'] },
              { label: 'Female', value: 'female' as Settings['alcohol.sex'] },
            ]}
          />
        </div>
        <div className="row">
          <span className="grow">Usual bedtime</span>
          <input type="time" aria-label="Usual bedtime" style={{ width: 120 }} value={v['alcohol.usualBedtime']} onChange={(e) => set('alcohol.usualBedtime', e.target.value)} />
        </div>
        {num('alcohol.usualSleepHours', 'Usual sleep (h)', '0.5', 3, 14)}
        {num('alcohol.eliminationRate', 'Elimination (g/L per h)', '0.01', 0.08, 0.3)}
        {num('alcohol.absorptionHalfLifeMin', 'Absorption half-life (min)', '1', 3, 60)}
        {num('caffeine.halfLifeHours', 'Caffeine half-life (h)', '0.5', 2, 10)}
        <div className="row">
          <span className="grow">Cups a day</span>
          <Chips label="Cups a day" value={v['caffeine.perDay']} onChange={(n) => set('caffeine.perDay', n)} options={[0, 1, 2, 3].map((n) => ({ label: n === 0 ? 'Just count' : `${n}`, value: n }))} />
        </div>
        <div className="row">
          <span className="grow">Last cup by</span>
          <input type="time" aria-label="Last cup by" style={{ width: 120 }} value={v['caffeine.latestTime']} onChange={(e) => set('caffeine.latestTime', e.target.value)} />
        </div>
        <div className="row">
          <span className="grow">Usual cup</span>
          <select aria-label="Usual cup" value={v['caffeine.usual'].preset} onChange={(e) => {
            const p = CAFFEINE_PRESETS.find((x) => x.key === e.target.value)
            if (p) set('caffeine.usual', { preset: p.key, name: p.label, mg: p.mg })
          }}>
            {CAFFEINE_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} · {p.mg} mg
              </option>
            ))}
            {!CAFFEINE_PRESETS.some((p) => p.key === v['caffeine.usual'].preset) ? <option value={v['caffeine.usual'].preset}>{v['caffeine.usual'].name} · {v['caffeine.usual'].mg} mg</option> : null}
          </select>
        </div>
        <div className="row">
          <span className="grow">Medication reminders</span>
          <Toggle label="Medication reminders" checked={v['alcohol.medicationReminders']} onChange={(on) => set('alcohol.medicationReminders', on)} />
        </div>
        <div className="muted small">{DISCLAIMER}</div>
      </div>
    </Card>
  )
}
