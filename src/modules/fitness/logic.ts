import { ACTIVITY_TYPES, AMBER_LEAD_HOURS, DEFAULT_RECOVERY_WINDOW, HARD_ACTIVITY_RPE, RECOVERY_WINDOWS } from './data/recovery'
import { SECONDARY_MUSCLES } from './data/exercises'

export interface SetLike {
  weight: number | null
  reps: number | null
  rir?: number | null
}

/** Epley: a standard estimate of a one-rep max from a submaximal set. */
export function epley(weight: number, reps: number): number {
  if (!weight || !reps) return 0
  return Math.round(weight * (1 + reps / 30))
}

/** Heaviest set; ties broken by reps. */
export function topSet<T extends SetLike>(sets: T[]): T | null {
  let top: T | null = null
  for (const s of sets) {
    if (!top) {
      top = s
      continue
    }
    const w = s.weight ?? 0
    const tw = top.weight ?? 0
    if (w > tw || (w === tw && (s.reps ?? 0) > (top.reps ?? 0))) top = s
  }
  return top
}

export function beatsRecord(candidate: SetLike | null, stored: { weight: number | null; reps: number | null } | null): boolean {
  if (!candidate) return false
  if (!stored) return true
  const w = candidate.weight ?? 0
  const sw = stored.weight ?? 0
  return w > sw || (w === sw && (candidate.reps ?? 0) > (stored.reps ?? 0))
}

export const hasData = (s: SetLike): boolean => s.weight !== null || s.reps !== null

/** Lowest RIR logged across the sets (null when none logged). */
export function hardestRir(sets: SetLike[]): number | null {
  let min: number | null = null
  for (const s of sets) if (s.rir !== null && s.rir !== undefined && (min === null || s.rir < min)) min = s.rir
  return min
}
export const wasHard = (sets: SetLike[]): boolean => {
  const r = hardestRir(sets)
  return r !== null && r <= 1
}

export function sessionVolume(exercises: { sets: SetLike[] }[]): number {
  let v = 0
  for (const e of exercises) for (const s of e.sets) v += (s.weight ?? 0) * (s.reps ?? 0)
  return Math.round(v)
}

/* ---------- readiness ---------- */

export interface SessionLike {
  atMs: number
  exercises: { muscle: string; exercise_id: string; sets: SetLike[] }[]
}
export interface ActivityLike {
  atMs: number
  type: string
  rpe: number | null
}
export type Stage = 'ready' | 'amber' | 'red' | 'none'
export interface Readiness {
  muscle: string
  stage: Stage
  /** Hours until ready (0 when ready). */
  hoursLeft: number
  lastAtMs: number | null
  /** Only indirect work on record. */
  indirectOnly: boolean
}

interface Touch {
  primary: number | null
  secondary: number | null
  primaryHard: boolean
  secondaryHard: boolean
}

const HOUR = 3_600_000

/**
 * Muscle readiness from the training log: four windows per muscle (direct or indirect work,
 * hard or with reps in reserve), scaled by the recovery pace. Wall-clock hours, not days.
 */
export function readiness(muscles: readonly string[], sessions: SessionLike[], activities: ActivityLike[], nowMs: number, paceFactor = 1): Readiness[] {
  const map = new Map<string, Touch>()
  const touch = (muscle: string, kind: 'primary' | 'secondary', at: number, hard: boolean) => {
    const e = map.get(muscle) ?? { primary: null, secondary: null, primaryHard: false, secondaryHard: false }
    if (e[kind] === null || at > e[kind]!) {
      e[kind] = at
      if (kind === 'primary') e.primaryHard = hard
      else e.secondaryHard = hard
    }
    map.set(muscle, e)
  }
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const hard = wasHard(ex.sets)
      touch(ex.muscle, 'primary', s.atMs, hard)
      for (const m of SECONDARY_MUSCLES[ex.exercise_id] ?? []) touch(m, 'secondary', s.atMs, hard)
    }
  }
  for (const a of activities) {
    const type = ACTIVITY_TYPES.find((t) => t.id === a.type)
    if (!type) continue
    const hard = (a.rpe ?? 0) >= HARD_ACTIVITY_RPE
    for (const m of type.primary) touch(m, 'primary', a.atMs, hard)
    for (const m of type.secondary) touch(m, 'secondary', a.atMs, hard)
  }
  return muscles.map((muscle) => {
    const e = map.get(muscle)
    if (!e || (e.primary === null && e.secondary === null)) return { muscle, stage: 'none', hoursLeft: 0, lastAtMs: null, indirectOnly: false }
    const w = RECOVERY_WINDOWS[muscle] ?? DEFAULT_RECOVERY_WINDOW
    const readyAt = (at: number | null, hours: number) => (at === null ? 0 : at + hours * paceFactor * HOUR)
    const direct = readyAt(e.primary, e.primaryHard ? w[0] : w[1])
    const indirect = readyAt(e.secondary, e.secondaryHard ? w[2] : w[3])
    const readyMs = Math.max(direct, indirect)
    const hoursLeft = Math.max(0, (readyMs - nowMs) / HOUR)
    const stage: Stage = hoursLeft <= 0 ? 'ready' : hoursLeft <= AMBER_LEAD_HOURS ? 'amber' : 'red'
    return { muscle, stage, hoursLeft, lastAtMs: Math.max(e.primary ?? 0, e.secondary ?? 0) || null, indirectOnly: e.primary === null }
  })
}

/** Sets per muscle over the sessions given; secondary muscles count half. */
export function weeklyVolume(muscles: readonly string[], sessions: SessionLike[]): Map<string, number> {
  const out = new Map<string, number>(muscles.map((m) => [m, 0]))
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const n = ex.sets.length
      if (out.has(ex.muscle)) out.set(ex.muscle, out.get(ex.muscle)! + n)
      for (const m of SECONDARY_MUSCLES[ex.exercise_id] ?? []) if (out.has(m)) out.set(m, out.get(m)! + n * 0.5)
    }
  }
  return out
}

/* ---------- programmes ---------- */

export interface ProgrammeDay {
  key: string
  name: string
  muscles: string[]
  exercises: { id: string; name: string; muscle: string; type?: string; variant?: string }[]
}
export interface ProgrammeLogEntry {
  dayKey: string
  dayName: string
  date: string
  at: string
  workoutId?: string
  sessionId?: string
}

export function programmeNextIndex(days: ProgrammeDay[], log: ProgrammeLogEntry[]): number {
  if (log.length === 0 || days.length === 0) return 0
  const last = log[log.length - 1]!
  const idx = days.findIndex((d) => d.key === last.dayKey)
  return idx === -1 ? 0 : (idx + 1) % days.length
}

/** Calendar weeks since the first logged session (or creation), clamped to the block length. */
export function programmeWeek(createdAt: string, log: ProgrammeLogEntry[], weeks: number, nowMs: number): number {
  const first = log.length ? log.reduce((a, b) => ((a.at || a.date) <= (b.at || b.date) ? a : b)) : null
  const started = Date.parse(first ? first.at || first.date : createdAt)
  if (!Number.isFinite(started)) return 1
  const wk = Math.floor(Math.max(0, nowMs - started) / (7 * 86_400_000)) + 1
  return Math.min(Math.max(1, wk), weeks || wk)
}

/** Planned sets for an exercise: last time's sets (weight and reps) unticked, or empty rows. */
export function plannedSets(last: SetLike[] | null, startingSets: number): { weight: number | null; reps: number | null; rir: number | null; done: 0 }[] {
  if (last && last.length) return last.map((s) => ({ weight: s.weight, reps: s.reps, rir: null, done: 0 }))
  return Array.from({ length: Math.max(1, startingSets) }, () => ({ weight: null, reps: null, rir: null, done: 0 }))
}

export const kgToLb = (kg: number) => Math.round(kg * 2.20462 * 10) / 10
export const lbToKg = (lb: number) => Math.round((lb / 2.20462) * 10) / 10
