import { sparklinePath } from './format'

export function Sparkline({ values, label, height = 48 }: { values: number[]; label: string; height?: number }) {
  if (values.length < 2) return null
  return (
    <svg width="100%" height={height} viewBox={`0 0 200 ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <path d={sparklinePath(values, 200, height)} fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  )
}
