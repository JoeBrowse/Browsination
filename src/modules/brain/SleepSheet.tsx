import { useEffect, useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { LOG } from './repo'
import { useBrainRepo, type CheckInData } from './useBrain'

/** Hours between two 'HH:MM' wall-clock times, wrapping past midnight. */
export function sleepHours(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number) as [number, number]
  const [wh, wm] = wake.split(':').map(Number) as [number, number]
  let mins = wh * 60 + wm - (bh * 60 + bm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}

export function SleepSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: CheckInData }) {
  const repo = useBrainRepo()
  const p = (data.sleep?.payload ?? {}) as { bed_at?: string; wake_at?: string; quality?: number }
  const [bed, setBed] = useState(p.bed_at ?? '23:00')
  const [wake, setWake] = useState(p.wake_at ?? '07:00')
  const [quality, setQuality] = useState<number>(p.quality ?? 3)
  useEffect(() => {
    if (!open) return
    void repo.logs.lastOfType(LOG.sleep).then((last) => {
      const lp = (data.sleep?.payload ?? last?.payload ?? {}) as { bed_at?: string; wake_at?: string; quality?: number }
      setBed(lp.bed_at ?? '23:00')
      setWake(lp.wake_at ?? '07:00')
      setQuality((data.sleep?.payload as { quality?: number } | undefined)?.quality ?? 3)
    })
  }, [open, data.sleep, repo])
  const hours = sleepHours(bed, wake)
  const save = async () => {
    await repo.upsertDaily(LOG.sleep, data.today, data.dayStartHour, { value: hours, unit: 'h', payload: { bed_at: bed, wake_at: wake, quality } })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Sleep">
      <div className="stack">
        <div className="row">
          <label className="grow">
            <span className="muted small">Bed</span>
            <input type="time" aria-label="Bed time" value={bed} onChange={(e) => setBed(e.target.value)} />
          </label>
          <label className="grow">
            <span className="muted small">Woke</span>
            <input type="time" aria-label="Wake time" value={wake} onChange={(e) => setWake(e.target.value)} />
          </label>
        </div>
        <div className="muted small">{hours} h</div>
        <Chips label="Quality" value={quality} onChange={setQuality} options={[1, 2, 3, 4, 5].map((v) => ({ label: String(v), value: v }))} />
        <Button variant="primary" block onClick={() => void save()}>
          Save
        </Button>
      </div>
    </Sheet>
  )
}
