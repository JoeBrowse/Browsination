import { useEffect, useMemo, useState } from 'react'
import { stampOf, WhenField, whenNow, whenOf, type When } from '@/app/logs/WhenField'
import { toast } from '@/app/shellStore'
import type { LogEntry } from '@/core/repos/logEntries'
import { calendarDay } from '@/core/time/localDay'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { bedtimeNote, CAFFEINE_PRESETS, remainingAt } from './caffeine'
import { nextWallClock } from './forecast'
import { useServices } from '@/app/services'
import { nthLabel } from './coffee'
import { useAlcoholRepo, useAlcoholSettings, useCoffee } from './useAlcohol'

type Spec = { preset: string; name: string; mg: number }

const specOf = (e: LogEntry): Spec => ({ preset: String(e.payload.preset ?? 'custom'), name: String(e.payload.name ?? 'Caffeine'), mg: e.value ?? 0 })

export function CaffeineSheet({ open, onClose, initial, entry }: { open: boolean; onClose: () => void; initial?: Spec | null; entry?: LogEntry | null }) {
  const s = useServices()
  const repo = useAlcoholRepo()
  const settings = useAlcoholSettings()
  const coffee = useCoffee()
  const [spec, setSpec] = useState<Spec>(entry ? specOf(entry) : (initial ?? { preset: 'coffee', name: 'Coffee', mg: 95 }))
  const [when, setWhen] = useState<When>(entry ? whenOf(entry) : whenNow())
  useEffect(() => {
    if (open) {
      setSpec(entry ? specOf(entry) : (initial ?? { preset: 'coffee', name: 'Coffee', mg: 95 }))
      setWhen(entry ? whenOf(entry) : whenNow())
    }
  }, [open, initial, entry])
  const today = when.day === calendarDay() && !entry
  const doses = useQuery(() => repo.dosesSince(new Date(Date.now() - 24 * 3_600_000).toISOString()), ['log_entries'])
  const note = useMemo(() => {
    if (!settings.data || !doses.data || !today) return null
    const now = Date.now()
    const bed = nextWallClock(settings.data.usualBedtime, now)
    const mg = remainingAt([...doses.data, { atMs: now, mg: spec.mg }], bed, settings.data.caffeineHalfLifeHours)
    return bedtimeNote(mg)
  }, [settings.data, doses.data, spec.mg, today])
  const save = async () => {
    const stamp = stampOf(when)
    if (entry) await repo.updateCaffeine(entry.id, spec.mg, spec.preset, spec.name, stamp)
    else await repo.logCaffeine(spec.mg, spec.preset, spec.name, stamp.ts)
    toast(`${spec.name} ${spec.mg} mg`)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Caffeine">
      <div className="stack">
        <div className="chips" role="group" aria-label="Caffeine presets">
          {CAFFEINE_PRESETS.map((p) => (
            <button key={p.key} className={`chip${spec.preset === p.key ? ' on' : ''}`} aria-pressed={spec.preset === p.key} onClick={() => setSpec({ preset: p.key, name: p.label, mg: p.mg })}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="row">
          <input type="number" inputMode="numeric" aria-label="Caffeine mg" value={spec.mg} onChange={(e) => setSpec({ ...spec, preset: 'custom', mg: Number(e.target.value) || 0 })} style={{ width: 120 }} />
          <span className="muted">mg</span>
        </div>
        <WhenField value={when} onChange={setWhen} />
        {coffee.data && today ? <div className="muted small">{nthLabel(coffee.data.today.cups + 1)}{coffee.data.today.target ? ` · target ${coffee.data.today.target} a day` : ''}</div> : null}
        {note ? <div className="small">{note}</div> : null}
        {coffee.data && (spec.preset !== coffee.data.usual.preset || spec.mg !== coffee.data.usual.mg) ? (
          <Button onClick={() => void s.settings.set('caffeine.usual', { preset: spec.preset, name: spec.name, mg: spec.mg })}>Make this my usual</Button>
        ) : null}
        <div className="btn-row">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={spec.mg <= 0}>
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
