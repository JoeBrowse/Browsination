import type { Pair } from '@/core/insights/stats'

/** Tiny scatter of the pairs behind a correlation; no axes, just the shape of the cloud. */
export function Scatter({ pairs, label }: { pairs: Pair[]; label: string }) {
  if (pairs.length < 3) return null
  const xs = pairs.map((p) => p.x)
  const ys = pairs.map((p) => p.y)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  const sx = (x: number) => 6 + ((x - x0) / (x1 - x0 || 1)) * 188
  const sy = (y: number) => 54 - ((y - y0) / (y1 - y0 || 1)) * 48
  return (
    <svg width="100%" height={60} viewBox="0 0 200 60" preserveAspectRatio="none" role="img" aria-label={label}>
      {pairs.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill="var(--accent)" opacity={0.7} />
      ))}
    </svg>
  )
}
