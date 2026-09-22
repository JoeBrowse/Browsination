import { Coffee } from 'lucide-react'
import { toast } from '@/app/shellStore'
import { Button } from '@/core/ui/primitives'
import { cupsLabel, nthLabel } from './coffee'
import { fmtTime, useAlcoholRepo, useCoffee } from './useAlcohol'

/**
 * One tap logs the usual cup. Everything else is information, never a verdict: the count against
 * the target, when it was, when it clears, and how the week has gone.
 */
export function CaffeineRow({ onOther }: { onOther: () => void }) {
  const repo = useAlcoholRepo()
  const q = useCoffee()
  const d = q.data
  if (!d) return null
  const log = async () => {
    await repo.logCaffeine(d.usual.mg, d.usual.preset, d.usual.name)
    toast(`${d.usual.name} · ${nthLabel(d.today.cups + 1)}`)
  }
  return (
    <>
      <div className="row" style={{ minHeight: 44 }}>
        <span className="grow">
          {d.usual.name}
          {d.today.cups ? <span className="muted small"> {cupsLabel(d.today)} · {fmtTime(d.today.firstMs!)}</span> : d.today.target ? <span className="muted small"> none yet</span> : null}
        </span>
        <Button variant={d.today.left > 0 ? 'primary' : undefined} onClick={() => void log()} ariaLabel={`Log ${d.usual.name}`}>
          <Coffee size={18} aria-hidden /> {d.today.left > 0 || !d.today.target ? 'Cup' : 'Another'}
        </Button>
        <Button onClick={onOther} ariaLabel="Other caffeine">
          …
        </Button>
      </div>
      {d.today.cups ? (
        <div className="muted small">
          {d.today.mg} mg{d.clearAtMs ? ` · clear by ${fmtTime(d.clearAtMs)}` : ' · already low'}
          {d.today.late ? ` · after ${d.latestTime}` : ''}
        </div>
      ) : null}
    </>
  )
}

/** Hub card: the same tap, plus the week. */
export function CaffeineCard({ onOther }: { onOther: () => void }) {
  const q = useCoffee()
  const d = q.data
  if (!d) return null
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <CaffeineRow onOther={onOther} />
      <div className="kv small">
        <span className="muted">Last 7 days</span>
        <span className="pill">
          {d.week.within} of {d.week.window} at or under {d.today.target}
        </span>
      </div>
      <div className="kv small">
        <span className="muted">Average</span>
        <span>
          {d.week.average} a day
          {d.week.none ? ` · ${d.week.none} without` : ''}
        </span>
      </div>
      <div className="week-dots" aria-label="Cups each day, oldest first">
        {d.week.perDay.map((day) => (
          <span key={day.day} className={day.cups === 0 ? '' : day.cups <= d.today.target ? 'on' : 'over'} title={`${day.day}: ${day.cups}`} />
        ))}
      </div>
    </div>
  )
}
