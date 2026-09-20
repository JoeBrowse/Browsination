import { band, bacAt, curve, summarise, unitsFromGrams, WEEKLY_GUIDELINE_UNITS, type CurvePoint, type Drink, type ModelParams, type Person } from './model'

export interface ForecastInput {
  /** Drinks already logged (today's session and anything still in the system). */
  existing: Drink[]
  /** The drink being considered. */
  candidate: Drink | null
  person: Person
  params: ModelParams
  nowMs: number
  /** Usual bedtime as local wall-clock 'HH:MM'. */
  usualBedtime: string
  usualSleepHours: number
  /** Grams already logged in the rolling week (excluding `existing` of today is fine; caller decides). */
  weekGramsSoFar: number
}

export interface TimelineLine {
  atMs: number
  text: string
}

export interface Forecast {
  without: CurvePoint[]
  with: CurvePoint[]
  peak: { atMs: number; bac: number } | null
  zeroAtMs: number | null
  bacNow: number
  timeline: TimelineLine[]
  sleep: { bedtimeMs: number; bacAtBed: number; text: string }
  morning: { wakeMs: number; bacAtWake: number; text: string }
  session: { grams: number; units: number }
  week: { units: number; guideline: number }
}

/** Next occurrence of a local 'HH:MM' at or after `fromMs`. */
export function nextWallClock(time: string, fromMs: number): number {
  const [h, m] = time.split(':').map(Number) as [number, number]
  const d = new Date(fromMs)
  d.setHours(h, m, 0, 0)
  if (d.getTime() < fromMs - 3 * 3_600_000) d.setDate(d.getDate() + 1)
  return d.getTime()
}

export function forecast(input: ForecastInput): Forecast {
  const { existing, candidate, person, params, nowMs } = input
  const all = candidate ? [...existing, candidate] : existing
  const horizon = nowMs + 20 * 3_600_000
  const from = nowMs - 6 * 3_600_000
  const withCurve = curve(all, person, params, from, horizon, 2)
  const withoutCurve = curve(existing, person, params, from, horizon, 2)
  const s = summarise(withCurve, nowMs)

  const bedtimeMs = nextWallClock(input.usualBedtime, nowMs)
  const wakeMs = bedtimeMs + input.usualSleepHours * 3_600_000
  const bacAtBed = bacAt(withCurve, bedtimeMs)
  const bacAtWake = bacAt(withCurve, wakeMs)
  const sessionGrams = all.reduce((n, d) => n + d.grams, 0)
  const sessionUnits = unitsFromGrams(sessionGrams)

  const timeline: TimelineLine[] = []
  if (s.peak && s.peak.bac > 0.05) {
    const b = band(s.peak.bac)
    timeline.push({ atMs: s.peak.tMs, text: `Peak around ${fmt(s.peak.tMs)}: ${b.label} (${b.note})` })
    // "feel best": the rising stretch while still under the moderate band
    const best = withCurve.find((p) => p.tMs >= nowMs && p.bac >= 0.15)
    if (best && s.peak.bac >= 0.3) timeline.unshift({ atMs: best.tMs, text: `Likely feeling best from ${fmt(best.tMs)} until the peak` })
    const tips = withCurve.find((p) => p.tMs >= nowMs && p.bac >= 0.6)
    if (tips) timeline.push({ atMs: tips.tMs, text: `Tips negative around ${fmt(tips.tMs)}: coordination and judgement drop, tomorrow gets worse` })
    if (s.zeroAtMs) timeline.push({ atMs: s.zeroAtMs, text: `Back to zero around ${fmt(s.zeroAtMs)}` })
    else timeline.push({ atMs: horizon, text: 'Still not at zero 20 hours from now' })
  }
  timeline.sort((a, b) => a.atMs - b.atMs)

  const sleepText =
    bacAtBed < 0.05
      ? 'Likely clear by bedtime: little effect on sleep expected'
      : bacAtBed < 0.3
        ? `About ${bacAtBed.toFixed(2)} g/L still in the system at bedtime: falling asleep fast but lighter sleep and earlier waking are likely`
        : `About ${bacAtBed.toFixed(2)} g/L still in the system at bedtime: expect fragmented sleep, less deep sleep and a poor second half of the night`
  const morningText =
    bacAtWake > 0.05
      ? `Still around ${bacAtWake.toFixed(2)} g/L at ${fmt(wakeMs)}: not clear on waking`
      : sessionUnits >= 8
        ? 'Clear by the morning, but this amount usually means a rough day'
        : sessionUnits >= 4
          ? 'Clear by the morning; some tiredness likely'
          : 'Clear by the morning; little next-day effect expected'

  return {
    without: withoutCurve,
    with: withCurve,
    peak: s.peak ? { atMs: s.peak.tMs, bac: s.peak.bac } : null,
    zeroAtMs: s.zeroAtMs,
    bacNow: s.bacNow,
    timeline,
    sleep: { bedtimeMs, bacAtBed, text: sleepText },
    morning: { wakeMs, bacAtWake, text: morningText },
    session: { grams: sessionGrams, units: sessionUnits },
    week: { units: unitsFromGrams(input.weekGramsSoFar) + (candidate ? unitsFromGrams(candidate.grams) : 0), guideline: WEEKLY_GUIDELINE_UNITS },
  }
}

function fmt(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export const DISCLAIMER =
  'Rough population-level estimates. Individual variation is large. Never use this to judge fitness to drive or for anything safety-critical.'
