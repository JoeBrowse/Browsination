/** Caffeine as a simple first-order decay per dose. Half-life defaults to 5 hours (typical range 3-7). */
export interface Dose {
  atMs: number
  mg: number
}

export const DEFAULT_HALF_LIFE_HOURS = 5

export function remainingAt(doses: Dose[], tMs: number, halfLifeHours = DEFAULT_HALF_LIFE_HOURS): number {
  const hl = Math.max(0.5, halfLifeHours) * 3_600_000
  let total = 0
  for (const d of doses) if (d.atMs <= tMs) total += d.mg * Math.pow(0.5, (tMs - d.atMs) / hl)
  return total
}

export function caffeineCurve(doses: Dose[], fromMs: number, toMs: number, halfLifeHours = DEFAULT_HALF_LIFE_HOURS, stepMin = 10): { tMs: number; mg: number }[] {
  const out: { tMs: number; mg: number }[] = []
  for (let t = fromMs; t <= toMs; t += stepMin * 60_000) out.push({ tMs: t, mg: remainingAt(doses, t, halfLifeHours) })
  return out
}

/** Below this the effect on sleep is usually small. */
export const SLEEP_THRESHOLD_MG = 50

export function bedtimeNote(mgAtBed: number): string {
  if (mgAtBed < SLEEP_THRESHOLD_MG) return `About ${Math.round(mgAtBed)} mg still active at bedtime: unlikely to matter`
  if (mgAtBed < 120) return `About ${Math.round(mgAtBed)} mg still active at bedtime: may delay falling asleep`
  return `About ${Math.round(mgAtBed)} mg still active at bedtime: likely to shorten and lighten sleep`
}

export const CAFFEINE_PRESETS: { key: string; label: string; mg: number }[] = [
  { key: 'espresso', label: 'Espresso', mg: 63 },
  { key: 'coffee', label: 'Coffee', mg: 95 },
  { key: 'instant', label: 'Instant', mg: 60 },
  { key: 'tea', label: 'Tea', mg: 40 },
  { key: 'green', label: 'Green tea', mg: 28 },
  { key: 'energy', label: 'Energy drink', mg: 80 },
  { key: 'cola', label: 'Cola', mg: 35 },
]
