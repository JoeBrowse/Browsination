import type { HeatWeek } from '../consistency/consistency'

/** 12-week grid, Monday first. Hit days in the accent, misses muted, future days blank. No streak anywhere. */
export function Heatmap({ weeks, label }: { weeks: HeatWeek[]; label: string }) {
  return (
    <div className="heat" role="img" aria-label={label}>
      {weeks.map((w) => (
        <div key={w.monday} className="heat-week">
          {w.days.map((d) => (
            <span key={d.day} className={`heat-day${d.hit ? ' hit' : ''}${d.future ? ' future' : ''}`} title={d.day} />
          ))}
        </div>
      ))}
    </div>
  )
}
