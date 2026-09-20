/**
 * Blood alcohol estimate: Widmark distribution, first-order absorption per drink, zero-order
 * elimination, cumulative over every drink still in the system.
 *
 * These are rough population-level estimates. Individual variation is large. Nothing here is
 * fit to judge fitness to drive or anything safety-critical, and the UI never presents it that way.
 *
 * Units: alcohol mass in grams; concentration in g/L of blood (0.5 g/L = 50 mg per 100 mL = 0.05%).
 *
 * Parameters (all documented, all overridable):
 *  - Widmark factor r: share of body mass that alcohol distributes into. Defaults 0.68 (male), 0.55 (female).
 *  - eliminationRate β: g/L removed per hour once absorbed. Default 0.15 (population mean; typical range 0.10–0.25).
 *  - absorptionHalfLifeMin: how fast a drink is absorbed (first order). Default 12 min, so a drink peaks
 *    about 40 minutes in; empty stomach is nearer 6, a big meal nearer 20-25.
 *  - Ethanol density 0.789 g/mL. UK unit = 10 mL of pure ethanol (7.89 g).
 */
export interface Drink {
  /** Instant the drink was started. */
  atMs: number
  grams: number
}

export interface Person {
  weightKg: number
  sex: 'male' | 'female'
}

export interface ModelParams {
  eliminationRate: number
  absorptionHalfLifeMin: number
  widmarkR?: number
}

export const DEFAULT_PARAMS: ModelParams = { eliminationRate: 0.15, absorptionHalfLifeMin: 12 }
export const ETHANOL_DENSITY = 0.789
export const GRAMS_PER_UK_UNIT = 7.89
export const WEEKLY_GUIDELINE_UNITS = 14

export function gramsOf(volumeMl: number, abvPercent: number): number {
  return (volumeMl * abvPercent * ETHANOL_DENSITY) / 100
}
export function ukUnitsOf(volumeMl: number, abvPercent: number): number {
  return (volumeMl * abvPercent) / 1000
}
export function unitsFromGrams(grams: number): number {
  return grams / GRAMS_PER_UK_UNIT
}

export function widmarkR(person: Person, params: ModelParams): number {
  return params.widmarkR ?? (person.sex === 'female' ? 0.55 : 0.68)
}

/** Peak concentration one drink would reach on its own if fully absorbed and nothing eliminated. */
export function peakOf(grams: number, person: Person, params: ModelParams): number {
  return grams / (widmarkR(person, params) * person.weightKg)
}

export interface CurvePoint {
  tMs: number
  bac: number
}

/**
 * Minute-step simulation. Absorption of each drink is first order; elimination is a constant
 * rate that only runs while alcohol is present. Adding a drink and recomputing therefore
 * carries over everything not yet metabolised.
 */
export function curve(drinks: Drink[], person: Person, params: ModelParams, fromMs: number, toMs: number, stepMin = 1): CurvePoint[] {
  const sorted = [...drinks].filter((d) => d.grams > 0).sort((a, b) => a.atMs - b.atMs)
  const k = Math.log(2) / Math.max(1, params.absorptionHalfLifeMin) // per minute
  const start = sorted.length ? Math.min(fromMs, sorted[0]!.atMs) : fromMs
  const stepMs = stepMin * 60_000
  const out: CurvePoint[] = []
  let eliminated = 0
  for (let t = start; t <= toMs; t += stepMs) {
    let absorbed = 0
    for (const d of sorted) {
      if (d.atMs > t) break
      absorbed += peakOf(d.grams, person, params) * (1 - Math.exp(-k * ((t - d.atMs) / 60_000)))
    }
    let present = absorbed - eliminated
    if (present < 1e-6) {
      present = 0
      eliminated = absorbed
    }
    if (t >= fromMs) out.push({ tMs: t, bac: present })
    if (present > 0) eliminated = Math.min(absorbed, eliminated + (params.eliminationRate * stepMin) / 60)
  }
  return out
}

export interface CurveSummary {
  peak: CurvePoint | null
  /** First instant after the peak where the estimate is back at zero (null if not within the window). */
  zeroAtMs: number | null
  bacNow: number
}

export function summarise(points: CurvePoint[], nowMs: number): CurveSummary {
  let peak: CurvePoint | null = null
  for (const p of points) if (!peak || p.bac > peak.bac) peak = p
  let zeroAtMs: number | null = null
  if (peak && peak.bac > 0) {
    for (const p of points) if (p.tMs > peak.tMs && p.bac <= 0.001) {
      zeroAtMs = p.tMs
      break
    }
  }
  const now = points.reduce<CurvePoint | null>((best, p) => (p.tMs <= nowMs ? p : best), null)
  return { peak, zeroAtMs, bacNow: now?.bac ?? 0 }
}

export function bacAt(points: CurvePoint[], tMs: number): number {
  let bac = 0
  for (const p of points) {
    if (p.tMs > tMs) break
    bac = p.bac
  }
  return bac
}

/** Plain-language band for a concentration. Neutral wording; nothing about driving. */
export function band(bac: number): { label: string; note: string } {
  if (bac < 0.1) return { label: 'clear', note: 'no noticeable effect' }
  if (bac < 0.3) return { label: 'light', note: 'relaxed, warm, talkative' }
  if (bac < 0.6) return { label: 'moderate', note: 'buzz, looser judgement and coordination' }
  if (bac < 1.0) return { label: 'strong', note: 'slurring, poor balance, memory gaps likely' }
  if (bac < 1.5) return { label: 'heavy', note: 'nausea and blackouts likely' }
  return { label: 'severe', note: 'dangerous level, risk of passing out' }
}
