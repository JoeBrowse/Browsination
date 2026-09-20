import type { CurvePoint } from './model'

/** Two curves (with and without the candidate drink), now and bedtime markers. Values in g/L. */
export function BacChart({ withCurve, withoutCurve, nowMs, bedtimeMs, label }: { withCurve: CurvePoint[]; withoutCurve: CurvePoint[]; nowMs: number; bedtimeMs?: number; label: string }) {
  const w = 320
  const h = 120
  const pad = { l: 28, r: 6, t: 8, b: 18 }
  const all = [...withCurve, ...withoutCurve]
  if (all.length < 2) return null
  const t0 = all[0]!.tMs
  const t1 = all[all.length - 1]!.tMs
  const yMax = Math.max(0.5, Math.max(...all.map((p) => p.bac)) * 1.15)
  const x = (t: number) => pad.l + ((t - t0) / (t1 - t0 || 1)) * (w - pad.l - pad.r)
  const y = (v: number) => h - pad.b - (v / yMax) * (h - pad.t - pad.b)
  const path = (pts: CurvePoint[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.tMs).toFixed(1)},${y(p.bac).toFixed(1)}`).join(' ')
  const ticks = [0.2, 0.5, 0.8, 1.0].filter((v) => v <= yMax)
  const hours: number[] = []
  for (let t = Math.ceil(t0 / 3_600_000) * 3_600_000; t <= t1; t += 3 * 3_600_000) hours.push(t)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label={label}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
          <text x={pad.l - 4} y={y(v) + 4} fontSize="9" fill="var(--muted)" textAnchor="end">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {hours.map((t) => (
        <text key={t} x={x(t)} y={h - 4} fontSize="9" fill="var(--muted)" textAnchor="middle">
          {new Date(t).getHours()}h
        </text>
      ))}
      <line x1={x(nowMs)} x2={x(nowMs)} y1={pad.t} y2={h - pad.b} stroke="var(--muted)" strokeDasharray="2 3" />
      {bedtimeMs && bedtimeMs > t0 && bedtimeMs < t1 ? <line x1={x(bedtimeMs)} x2={x(bedtimeMs)} y1={pad.t} y2={h - pad.b} stroke="var(--accent)" strokeDasharray="1 4" /> : null}
      <path d={path(withoutCurve)} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={path(withCurve)} fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  )
}
