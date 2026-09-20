/** Stats for a practice routine's attempts, oldest first. */
export interface RoutineStats {
  count: number
  best: number | null
  /** Mean of the last ten attempts. */
  recentAvg: number | null
  /** Mean of all attempts. */
  avg: number | null
  /** Last twenty values, for the trend line. */
  trend: number[]
  /** Positive when the recent average beats the earlier average. */
  delta: number | null
}

export function routineStats(values: number[]): RoutineStats {
  if (values.length === 0) return { count: 0, best: null, recentAvg: null, avg: null, trend: [], delta: null }
  const recent = values.slice(-10)
  const earlier = values.slice(0, -10)
  const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length
  const recentAvg = Math.round(mean(recent) * 10) / 10
  return {
    count: values.length,
    best: Math.max(...values),
    recentAvg,
    avg: Math.round(mean(values) * 10) / 10,
    trend: values.slice(-20),
    delta: earlier.length ? Math.round((recentAvg - mean(earlier)) * 10) / 10 : null,
  }
}
