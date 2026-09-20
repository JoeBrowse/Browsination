import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/app/shellStore'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { bedtimeNote, CAFFEINE_PRESETS, remainingAt } from './caffeine'
import { nextWallClock } from './forecast'
import { useAlcoholRepo, useAlcoholSettings } from './useAlcohol'

export function CaffeineSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: { preset: string; name: string; mg: number } | null }) {
  const repo = useAlcoholRepo()
  const settings = useAlcoholSettings()
  const [spec, setSpec] = useState(initial ?? { preset: 'coffee', name: 'Coffee', mg: 95 })
  useEffect(() => {
    if (open) setSpec(initial ?? { preset: 'coffee', name: 'Coffee', mg: 95 })
  }, [open, initial])
  const doses = useQuery(() => repo.dosesSince(new Date(Date.now() - 24 * 3_600_000).toISOString()), ['log_entries'])
  const note = useMemo(() => {
    if (!settings.data || !doses.data) return null
    const now = Date.now()
    const bed = nextWallClock(settings.data.usualBedtime, now)
    const mg = remainingAt([...doses.data, { atMs: now, mg: spec.mg }], bed, settings.data.caffeineHalfLifeHours)
    return bedtimeNote(mg)
  }, [settings.data, doses.data, spec.mg])
  const save = async () => {
    await repo.logCaffeine(spec.mg, spec.preset, spec.name)
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
        {note ? <div className="small">{note}</div> : null}
        <div className="btn-row">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={spec.mg <= 0}>
            Log it
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
