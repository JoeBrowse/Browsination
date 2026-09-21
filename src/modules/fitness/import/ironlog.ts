import { newId } from '@/core/ids'
import type { Settings } from '@/core/settings/schema'
import { tzOffsetMin } from '@/core/time/localDay'
import { EXERCISE_BY_ID } from '../data/exercises'
import { hasData, type ProgrammeDay, type ProgrammeLogEntry } from '../logic'
import type { ExerciseInput, WeightUnit } from '../repo'

/** The Iron Log backup file (Settings → Backup): every storage key under `iron-log:` as `data`. */
export interface IronLogBackup {
  format: number
  app: string
  version?: string
  exportedAt?: string
  data: Record<string, unknown>
}

export class IronLogImportError extends Error {}

export function parseBackup(text: string): IronLogBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new IronLogImportError('Not a JSON file')
  }
  const b = parsed as Partial<IronLogBackup>
  if (!b || typeof b !== 'object' || b.format !== 1 || typeof b.data !== 'object' || b.data === null) throw new IronLogImportError('Not an Iron Log backup (format 1)')
  if (b.app && b.app !== 'Iron Log') throw new IronLogImportError(`This is a backup of "${b.app}", not Iron Log`)
  return b as IronLogBackup
}

export interface PlannedWorkout {
  id: string
  source: 'ironlog' | 'ironlog-history'
  source_id: string
  ts: string
  tz_offset_min: number
  unit: WeightUnit
  split: string
  notes: string
  programme_id: string | null
  day_key: string | null
  day_name: string
  finished_at: string | null
  exercises: (ExerciseInput & { notes?: string; brand?: string; grip?: string; superset?: string | null })[]
}
export interface ImportPlan {
  workouts: PlannedWorkout[]
  inProgress: PlannedWorkout | null
  bodyweights: { day: string; value: number; unit: WeightUnit }[]
  activities: { entity_id: string; ts: string; type: string; name: string | null; minutes: number; seconds: number | null; distance_km: number | null; rpe: number | null }[]
  programmes: { id: string; source_id: string; name: string; preset_key: string; weeks: number; days: ProgrammeDay[]; log: ProgrammeLogEntry[]; status: 'active' | 'finished'; finished_at: string | null; ended_early: number; created_at: string }[]
  templates: { source_id: string; name: string; split: string; exercises: { id: string; muscle: string }[]; selection: Record<string, number> }[]
  customExercises: { id: string; name: string; muscle: string; type: 'compound' | 'isolation' | 'mobility'; pattern: string; cue: string; secondary: string[] }[]
  records: { exercise_id: string; kind: 'pb' | 'manual_1rm'; weight: number | null; reps: number | null; value: number | null; day: string | null }[]
  goals: { exercise_id: string; current: number | null; target: number | null; level: string; weeks: number | null; is_bodyweight: number; milestones: unknown[] }[]
  settings: Partial<Settings>
  skipped: { workouts: number; programmes: number; templates: number; activities: number; inProgress: number }
  warnings: string[]
  ignoredKeys: string[]
}
export interface Existing {
  workoutSourceIds: Set<string>
  programmeSourceIds: Set<string>
  templateSourceIds: Set<string>
  activityIds: Set<string>
  inProgress: boolean
  customExerciseIds: Set<string>
}

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v)
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter(isRec) : [])
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}
const noon = (date: string) => new Date(`${date}T12:00:00`)
/** Iron Log records `at` (an instant) and `date` (a local day); older rows have only the day. */
function instantOf(r: Rec): { ts: string; tz: number } | null {
  const at = str(r.at)
  if (at && Number.isFinite(Date.parse(at))) return { ts: new Date(at).toISOString(), tz: tzOffsetMin(new Date(at)) }
  const date = str(r.date)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ts: noon(date).toISOString(), tz: tzOffsetMin(noon(date)) }
  return null
}
const titleCase = (id: string) => id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function cleanSets(raw: unknown, withDone: boolean): NonNullable<ExerciseInput['sets']> {
  return arr(raw)
    .map((s) => {
      const drops = arr(s.drops).map((d) => ({ weight: num(d.weight), reps: num(d.reps) })).filter((d) => d.weight !== null || d.reps !== null)
      return { weight: num(s.weight), reps: num(s.reps), rir: num(s.rir), done: withDone ? (s.done === true ? 1 : 0) : 1, drops: JSON.stringify(drops) }
    })
    .filter((s) => hasData(s) || s.drops !== '[]')
}

/** Pure: reads the backup, decides every row to write, and explains what it left out. */
export function planImport(backup: IronLogBackup, existing: Existing): ImportPlan {
  const d = backup.data
  const settingsRaw = isRec(d.settings) ? d.settings : {}
  const unit: WeightUnit = settingsRaw.weightUnit === 'lb' ? 'lb' : 'kg'
  const plan: ImportPlan = { workouts: [], inProgress: null, bodyweights: [], activities: [], programmes: [], templates: [], customExercises: [], records: [], goals: [], settings: {}, skipped: { workouts: 0, programmes: 0, templates: 0, activities: 0, inProgress: 0 }, warnings: [], ignoredKeys: [] }
  const known = new Set<string>([...Object.keys(EXERCISE_BY_ID), ...existing.customExerciseIds])
  const ensureExercise = (id: string, name: string, muscle: string) => {
    if (!id || known.has(id)) return
    known.add(id)
    plan.customExercises.push({ id, name: name || titleCase(id), muscle: muscle || 'Other', type: 'compound', pattern: '', cue: '', secondary: [] })
    plan.warnings.push(`Unknown exercise "${name || id}" kept as a custom exercise`)
  }
  for (const c of arr(d['custom-exercises'])) {
    const id = str(c.id)
    if (!id || known.has(id)) continue
    known.add(id)
    plan.customExercises.push({ id, name: str(c.name, titleCase(id)), muscle: str(c.muscle, 'Other'), type: c.type === 'isolation' || c.type === 'mobility' ? c.type : 'compound', pattern: str(c.pattern), cue: str(c.cue), secondary: Array.isArray(c.secondary) ? c.secondary.filter((x): x is string => typeof x === 'string') : [] })
  }
  const nameOf = (id: string) => EXERCISE_BY_ID[id]?.name ?? plan.customExercises.find((c) => c.id === id)?.name ?? titleCase(id)
  const muscleOf = (id: string) => EXERCISE_BY_ID[id]?.muscle ?? plan.customExercises.find((c) => c.id === id)?.muscle ?? 'Other'

  // programmes first, so sessions can point at them
  const progs = [...(isRec(d['active-programme']) ? [{ p: d['active-programme'], status: 'active' as const }] : []), ...arr(d['finished-programmes']).map((p) => ({ p, status: 'finished' as const }))]
  for (const { p, status } of progs) {
    const sourceId = str(p.id)
    if (!sourceId) continue
    if (existing.programmeSourceIds.has(sourceId)) {
      plan.skipped.programmes++
      continue
    }
    const days: ProgrammeDay[] = arr(p.days).map((day, i) => ({ key: str(day.key, `d${i}`), name: str(day.name, 'Day'), muscles: Array.isArray(day.muscles) ? day.muscles.filter((m): m is string => typeof m === 'string') : [], exercises: arr(day.exercises).map((e) => ({ id: str(e.id), name: str(e.name, nameOf(str(e.id))), muscle: str(e.muscle, muscleOf(str(e.id))), type: str(e.type) || undefined })) }))
    for (const day of days) for (const e of day.exercises) ensureExercise(e.id, e.name, e.muscle)
    plan.programmes.push({ id: newId(), source_id: sourceId, name: str(p.name, 'Programme'), preset_key: str(p.presetKey), weeks: num(p.weeks) ?? 6, days, log: arr(p.log).map((l) => ({ dayKey: str(l.dayKey), dayName: str(l.dayName), date: str(l.date), at: str(l.at), sessionId: str(l.sessionId) || undefined })), status, finished_at: str(p.finishedAt) || null, ended_early: p.endedEarly ? 1 : 0, created_at: str(p.createdAt) || new Date().toISOString() })
  }
  const programmeIdFor = (sourceId: string) => plan.programmes.find((p) => p.source_id === sourceId)?.id ?? null

  // sessions
  const sessionKeys = new Set<string>()
  const sessions = arr(d['workout-history'])
  for (const s of sessions) {
    const when = instantOf(s)
    const sourceId = str(s.id) || (when ? `session-${when.ts}` : '')
    if (!when || !sourceId) {
      plan.warnings.push('A session without a date was skipped')
      continue
    }
    sessionKeys.add(when.ts)
    if (existing.workoutSourceIds.has(sourceId)) {
      plan.skipped.workouts++
      continue
    }
    const groups = arr(s.supersets)
    const supersetOf = (exId: string) => {
      const i = groups.findIndex((g) => Array.isArray(g.exIds) && g.exIds.includes(exId))
      return i === -1 ? null : String.fromCharCode(65 + i)
    }
    const exercises = arr(s.exercises).map((e) => {
      const id = str(e.id)
      ensureExercise(id, str(e.name), str(e.muscle))
      return { exercise_id: id, name: str(e.name, nameOf(id)), muscle: str(e.muscle, muscleOf(id)), method: str(e.method), notes: str(e.notes), brand: str(e.brand), grip: str(e.grip), superset: supersetOf(id), sets: cleanSets(e.sets, false) }
    })
    const programmeSource = str(s.programmeId)
    plan.workouts.push({ id: newId(), source: 'ironlog', source_id: sourceId, ts: when.ts, tz_offset_min: when.tz, unit, split: str(s.split), notes: '', programme_id: programmeSource ? programmeIdFor(programmeSource) : null, day_key: str(s.dayKey) || null, day_name: str(s.dayName), finished_at: when.ts, exercises })
  }
  // older per-exercise history that no session covers (Iron Log keeps 200 sessions but 20 entries per lift)
  const reconstructed = new Map<string, PlannedWorkout>()
  for (const [key, value] of Object.entries(d)) {
    if (!key.startsWith('ex-history:')) continue
    const exId = key.slice('ex-history:'.length)
    for (const h of arr(value)) {
      const when = instantOf(h)
      if (!when || sessionKeys.has(when.ts)) continue
      const sourceId = `hist-${when.ts}`
      if (existing.workoutSourceIds.has(sourceId)) {
        plan.skipped.workouts++
        sessionKeys.add(when.ts)
        continue
      }
      ensureExercise(exId, nameOf(exId), muscleOf(exId))
      const w = reconstructed.get(when.ts) ?? { id: newId(), source: 'ironlog-history' as const, source_id: sourceId, ts: when.ts, tz_offset_min: when.tz, unit, split: '', notes: 'Rebuilt from exercise history', programme_id: null, day_key: null, day_name: '', finished_at: when.ts, exercises: [] }
      w.exercises.push({ exercise_id: exId, name: nameOf(exId), muscle: muscleOf(exId), method: str(h.method), notes: str(h.notes), brand: str(h.brand), grip: str(h.grip), superset: null, sets: cleanSets(h.sets, false) })
      reconstructed.set(when.ts, w)
    }
  }
  for (const w of reconstructed.values()) plan.workouts.push(w)
  plan.workouts.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0))
  // programme logs: point at the imported workouts
  for (const p of plan.programmes) for (const l of p.log) {
    const w = plan.workouts.find((x) => x.source_id === l.sessionId)
    if (w) l.workoutId = w.id
  }
  // unfinished workout
  const snap = isRec(d['in-progress-workout']) ? d['in-progress-workout'] : null
  if (snap) {
    const setsBy = isRec(snap.sets) ? snap.sets : {}
    const exercises = arr(snap.exercises).map((e) => {
      const id = str(e.id)
      ensureExercise(id, str(e.name), str(e.muscle))
      return { exercise_id: id, name: str(e.name, nameOf(id)), muscle: str(e.muscle, muscleOf(id)), method: '', sets: cleanSets(setsBy[id], true) }
    })
    if (exercises.some((e) => e.sets!.length > 0)) {
      if (existing.inProgress) plan.skipped.inProgress = 1
      else {
        const when = instantOf({ at: str(snap.workoutDate) || str(snap.startedAt) }) ?? { ts: new Date().toISOString(), tz: tzOffsetMin() }
        plan.inProgress = { id: newId(), source: 'ironlog', source_id: 'in-progress', ts: when.ts, tz_offset_min: when.tz, unit, split: str(snap.split), notes: '', programme_id: null, day_key: null, day_name: '', finished_at: null, exercises }
      }
    }
  }
  // bodyweight, activities, templates, records, goals
  const byDay = new Map<string, { day: string; value: number; unit: WeightUnit }>()
  for (const b of arr(d['bodyweight-history'])) {
    const v = num(b.value)
    const day = str(b.date)
    if (v === null || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
    byDay.set(day, { day, value: v, unit: b.unit === 'lb' ? 'lb' : 'kg' })
  }
  plan.bodyweights = [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1))
  for (const a of arr(d['activity-history'])) {
    const id = str(a.id)
    const when = instantOf(a)
    if (!id || !when) continue
    if (existing.activityIds.has(id)) {
      plan.skipped.activities++
      continue
    }
    const minutes = (num(a.minutes) ?? 0) + (num(a.seconds) ?? 0) / 60
    plan.activities.push({ entity_id: id, ts: when.ts, type: str(a.type, 'other'), name: str(a.name) || null, minutes: Math.round(minutes * 100) / 100, seconds: num(a.seconds), distance_km: num(a.distance), rpe: num(a.rpe) })
  }
  for (const t of arr(d.templates)) {
    const id = str(t.id)
    if (!id) continue
    if (existing.templateSourceIds.has(id)) {
      plan.skipped.templates++
      continue
    }
    const exercises = arr(t.exercises).map((e) => ({ id: str(e.id), muscle: str(e.muscle, muscleOf(str(e.id))) }))
    for (const e of exercises) ensureExercise(e.id, nameOf(e.id), e.muscle)
    const selection: Record<string, number> = {}
    if (isRec(t.selection)) for (const [k, v] of Object.entries(t.selection)) if (typeof v === 'number') selection[k] = v
    plan.templates.push({ source_id: id, name: str(t.name, 'Template'), split: str(t.split), exercises, selection })
  }
  for (const [key, value] of Object.entries(d)) {
    if (key.startsWith('pb:') && isRec(value)) plan.records.push({ exercise_id: key.slice(3), kind: 'pb', weight: num(value.weight), reps: num(value.reps), value: null, day: str(value.date) || null })
    if (key.startsWith('manual-1rm:') && isRec(value)) plan.records.push({ exercise_id: key.slice(11), kind: 'manual_1rm', weight: null, reps: null, value: num(value.value), day: str(value.date) || null })
  }
  if (isRec(d['1rm-goals'])) {
    for (const [exId, g] of Object.entries(d['1rm-goals'])) {
      if (!isRec(g)) continue
      plan.goals.push({ exercise_id: exId, current: num(g.current), target: num(g.target), level: str(g.level), weeks: num(g.weeks), is_bodyweight: g.isBodyweight ? 1 : 0, milestones: Array.isArray(g.milestones) ? g.milestones : [] })
    }
  }
  // settings
  if (settingsRaw.weightUnit === 'kg' || settingsRaw.weightUnit === 'lb') plan.settings['fitness.weightUnit'] = settingsRaw.weightUnit
  const rc = num(settingsRaw.restCompound)
  if (rc) plan.settings['fitness.restCompound'] = rc
  const ri = num(settingsRaw.restIsolation)
  if (ri) plan.settings['fitness.restIsolation'] = ri
  const ss = num(settingsRaw.startingSets)
  if (ss) plan.settings['fitness.startingSets'] = ss
  if (settingsRaw.recoveryPace === 'faster' || settingsRaw.recoveryPace === 'normal' || settingsRaw.recoveryPace === 'slower') plan.settings['fitness.recoveryPace'] = settingsRaw.recoveryPace
  if (isRec(d['weight-tracking']) && num(d['weight-tracking'].goal) !== null) plan.settings['fitness.weightGoal'] = num(d['weight-tracking'].goal)
  if (isRec(d['personal-stats']) && num(d['personal-stats'].height) !== null) plan.settings['fitness.heightCm'] = num(d['personal-stats'].height)
  // what is left out
  const handled = new Set(['workout-history', 'in-progress-workout', 'bodyweight-history', 'bodyweight', 'weight-tracking', 'personal-stats', 'activity-history', 'templates', 'active-programme', 'finished-programmes', 'custom-exercises', '1rm-goals', 'settings'])
  for (const key of Object.keys(d)) if (!handled.has(key) && !key.startsWith('ex-history:') && !key.startsWith('pb:') && !key.startsWith('manual-1rm:')) plan.ignoredKeys.push(key)
  return plan
}

export interface ImportSummary {
  workouts: number
  sets: number
  bodyweights: number
  activities: number
  programmes: number
  templates: number
  customExercises: number
  records: number
  goals: number
  inProgress: number
}

export function summarise(plan: ImportPlan): ImportSummary {
  return {
    workouts: plan.workouts.length,
    sets: plan.workouts.reduce((n, w) => n + w.exercises.reduce((m, e) => m + (e.sets?.length ?? 0), 0), 0),
    bodyweights: plan.bodyweights.length,
    activities: plan.activities.length,
    programmes: plan.programmes.length,
    templates: plan.templates.length,
    customExercises: plan.customExercises.length,
    records: plan.records.length,
    goals: plan.goals.length,
    inProgress: plan.inProgress ? 1 : 0,
  }
}
