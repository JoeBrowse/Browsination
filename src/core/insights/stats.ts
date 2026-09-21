/** Small, dependency-free statistics for the insights screen. Everything is a correlation, never a cause. */

export interface Pair {
  x: number
  y: number
}

export interface Correlation {
  n: number
  /** Pearson r, null when fewer than 3 pairs or no variance. */
  r: number | null
  xMean: number | null
  yMean: number | null
}

export function pearson(pairs: Pair[]): Correlation {
  const n = pairs.length
  if (n === 0) return { n, r: null, xMean: null, yMean: null }
  const xMean = pairs.reduce((s, p) => s + p.x, 0) / n
  const yMean = pairs.reduce((s, p) => s + p.y, 0) / n
  if (n < 3) return { n, r: null, xMean, yMean }
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (const p of pairs) {
    sxy += (p.x - xMean) * (p.y - yMean)
    sxx += (p.x - xMean) ** 2
    syy += (p.y - yMean) ** 2
  }
  if (sxx === 0 || syy === 0) return { n, r: null, xMean, yMean }
  return { n, r: sxy / Math.sqrt(sxx * syy), xMean, yMean }
}

/** Plain words for r with the sample size in mind. Small samples are called out, not dressed up. */
export function describeCorrelation(c: Correlation, minN = 10): string {
  if (c.n < 3 || c.r === null) return c.n === 0 ? 'no data yet' : `${c.n} pair${c.n === 1 ? '' : 's'}, too few to say`
  const a = Math.abs(c.r)
  const strength = a < 0.2 ? 'no clear link' : a < 0.4 ? 'weak' : a < 0.6 ? 'moderate' : 'strong'
  const dir = c.r > 0 ? 'positive' : 'negative'
  const base = strength === 'no clear link' ? strength : `${strength} ${dir}`
  return c.n < minN ? `${base}, only ${c.n} pairs` : base
}

export const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/** Group values by a key, then average each group. */
export function groupMean(rows: { key: string; value: number }[]): Map<string, number> {
  const sums = new Map<string, { s: number; n: number }>()
  for (const r of rows) {
    const g = sums.get(r.key) ?? { s: 0, n: 0 }
    g.s += r.value
    g.n += 1
    sums.set(r.key, g)
  }
  return new Map([...sums].map(([k, g]) => [k, g.s / g.n]))
}

export function groupSum(rows: { key: string; value: number }[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const r of rows) out.set(r.key, (out.get(r.key) ?? 0) + r.value)
  return out
}

/** Pairs two per-key maps on their shared keys, optionally shifting the second by a key transform. */
export function pairMaps(xs: Map<string, number>, ys: Map<string, number>, shiftKey: (k: string) => string = (k) => k): Pair[] {
  const out: Pair[] = []
  for (const [k, x] of xs) {
    const y = ys.get(shiftKey(k))
    if (y !== undefined) out.push({ x, y })
  }
  return out
}

/** Percentage change between two periods (null when the earlier one is zero). */
export function pctChange(now: number, before: number): number | null {
  if (before === 0) return null
  return ((now - before) / Math.abs(before)) * 100
}
