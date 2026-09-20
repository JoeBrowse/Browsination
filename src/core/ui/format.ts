/** Money is integer pence, GBP only. */
export function pounds(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return ''
  return `£${(pence / 100).toFixed(2).replace(/\.00$/, '')}`
}

export function parsePounds(text: string): number | null {
  const n = Number(text.replace(/[£,\s]/g, ''))
  return Number.isFinite(n) && text.trim() !== '' ? Math.round(n * 100) : null
}

/** SVG path for a small trend line. */
export function sparklinePath(values: number[], width = 200, height = 40, pad = 3): string {
  if (values.length === 0) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0
  return values
    .map((v, i) => {
      const x = pad + i * step
      const y = height - pad - ((v - min) / span) * (height - pad * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function minutesLabel(min: number): string {
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}h ${m}m` : `${h}h`
}
