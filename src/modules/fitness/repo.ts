import type { SqlDriver } from '@/core/db/driver'
import { newId, nowIso } from '@/core/ids'
import { deleteRow, getRow, insertRow, parseJson, updateRow } from '@/core/repos/base'
import { logEntriesRepo, type LogEntry } from '@/core/repos/logEntries'
import { dayRange } from '@/core/tasks/queries'
import { calendarDay, stampNow, tzOffsetMin, type LocalDay } from '@/core/time/localDay'
import { EXERCISES, PB_EXERCISE_IDS, type ExerciseDef } from './data/exercises'
import { beatsRecord, hasData, sessionVolume, topSet, type ProgrammeDay, type ProgrammeLogEntry } from './logic'

export type WeightUnit = 'kg' | 'lb'
export interface WorkoutRow {
  id: string
  ts: string
  tz_offset_min: number
  unit: WeightUnit
  split: string
  notes: string
  programme_id: string | null
  day_key: string | null
  day_name: string
  finished_at: string | null
  source: string
  source_id: string | null
  created_at: string
  updated_at: string
}
export interface WorkoutExerciseRow {
  id: string
  workout_id: string
  position: number
  exercise_id: string
  name: string
  muscle: string
  method: string
  brand: string
  grip: string
  notes: string
  superset: string | null
  created_at: string
  updated_at: string
}
export interface SetRow {
  id: string
  workout_exercise_id: string
  position: number
  weight: number | null
  reps: number | null
  rir: number | null
  done: number
  /** JSON [{ weight, reps }] drop sets. */
  drops: string
  created_at: string
  updated_at: string
}
export interface FullExercise extends WorkoutExerciseRow {
  sets: SetRow[]
}
export interface FullWorkout extends WorkoutRow {
  exercises: FullExercise[]
}
export interface ProgrammeRow {
  id: string
  name: string
  preset_key: string
  weeks: number
  days: string
  log: string
  status: 'active' | 'finished'
  ended_early: number
  finished_at: string | null
  source_id: string | null
  created_at: string
  updated_at: string
}
export interface TemplateRow {
  id: string
  name: string
  split: string
  /** JSON [{ id, muscle }] */
  exercises: string
  selection: string
  source_id: string | null
  created_at: string
  updated_at: string
}
export interface RecordRow {
  id: string
  exercise_id: string
  kind: 'pb' | 'manual_1rm'
  weight: number | null
  reps: number | null
  value: number | null
  day: LocalDay | null
  note: string
  created_at: string
  updated_at: string
}
export interface GoalRow {
  id: string
  exercise_id: string
  current: number | null
  target: number | null
  level: string
  weeks: number | null
  is_bodyweight: number
  milestones: string
  created_at: string
  updated_at: string
}
export interface CustomExerciseRow {
  id: string
  name: string
  muscle: string
  type: 'compound' | 'isolation' | 'mobility'
  pattern: string
  cue: string
  secondary: string
  created_at: string
  updated_at: string
}
export interface ExerciseInput {
  exercise_id: string
  name: string
  muscle: string
  method?: string
  notes?: string
  brand?: string
  grip?: string
  superset?: string | null
  sets?: { weight: number | null; reps: number | null; rir?: number | null; done?: number; drops?: string }[]
}

/** Log types this module writes. */
export const LOG = {
  workout: 'workout', // value sets, unit 'sets', payload { split, exercises, volume, muscles, unit }, entity fitness.workout
  bodyweight: 'bodyweight', // value in `unit` (kg | lb), one per calendar day
  activity: 'activity', // value minutes, payload { type, name, distance_km, rpe, seconds }
} as const
export const WORKOUT_ENTITY = 'fitness.workout'

export function fitnessRepo(db: SqlDriver) {
  const logs = logEntriesRepo(db)
  const stamp = <T extends object>(row: T): T & { created_at: string; updated_at: string } => {
    const t = nowIso()
    return { ...row, created_at: t, updated_at: t }
  }
  const fill = async (rows: WorkoutRow[]): Promise<FullWorkout[]> => {
    if (rows.length === 0) return []
    const ids = rows.map((w) => w.id)
    const marks = ids.map(() => '?').join(', ')
    const exs = await db.query<WorkoutExerciseRow>(`SELECT * FROM workout_exercises WHERE workout_id IN (${marks}) ORDER BY position`, ids)
    const exIds = exs.map((e) => e.id)
    const sets = exIds.length ? await db.query<SetRow>(`SELECT * FROM workout_sets WHERE workout_exercise_id IN (${exIds.map(() => '?').join(', ')}) ORDER BY position`, exIds) : []
    const setsBy = new Map<string, SetRow[]>()
    for (const s of sets) setsBy.set(s.workout_exercise_id, [...(setsBy.get(s.workout_exercise_id) ?? []), s])
    const exBy = new Map<string, FullExercise[]>()
    for (const e of exs) exBy.set(e.workout_id, [...(exBy.get(e.workout_id) ?? []), { ...e, sets: setsBy.get(e.id) ?? [] }])
    return rows.map((w) => ({ ...w, exercises: exBy.get(w.id) ?? [] }))
  }
  const repo = {
    logs,
    // exercises
    customExercises: () => db.query<CustomExerciseRow>('SELECT * FROM fitness_exercises ORDER BY name COLLATE NOCASE'),
    async addCustomExercise(input: Partial<CustomExerciseRow> & { name: string; muscle: string }): Promise<CustomExerciseRow> {
      const row: CustomExerciseRow = stamp({ id: input.id ?? `custom-${newId()}`, name: input.name.trim(), muscle: input.muscle, type: input.type ?? 'compound', pattern: input.pattern ?? '', cue: input.cue ?? '', secondary: input.secondary ?? '[]' })
      await insertRow(db, 'fitness_exercises', row)
      return row
    },
    removeCustomExercise: (id: string) => deleteRow(db, 'fitness_exercises', id),
    async allExercises(): Promise<ExerciseDef[]> {
      const custom = await repo.customExercises()
      return [...EXERCISES, ...custom.map((c) => ({ id: c.id, name: c.name, muscle: c.muscle, type: c.type, pattern: c.pattern, cue: c.cue }))]
    },
    // workouts
    workouts: (limit = 200) => db.query<WorkoutRow>('SELECT * FROM workouts WHERE finished_at IS NOT NULL ORDER BY ts DESC LIMIT ?', [limit]),
    workoutsBetween: async (fromTs: string, toTs: string) => fill(await db.query<WorkoutRow>('SELECT * FROM workouts WHERE finished_at IS NOT NULL AND ts >= ? AND ts < ? ORDER BY ts', [fromTs, toTs])),
    recentFull: async (limit = 60) => fill(await db.query<WorkoutRow>('SELECT * FROM workouts WHERE finished_at IS NOT NULL ORDER BY ts DESC LIMIT ?', [limit])),
    workout: async (id: string) => (await fill((await db.query<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', [id])).slice(0, 1)))[0] ?? null,
    inProgress: async () => (await fill(await db.query<WorkoutRow>('SELECT * FROM workouts WHERE finished_at IS NULL ORDER BY created_at DESC LIMIT 1')))[0] ?? null,
    workoutSourceIds: async () => (await db.query<{ source_id: string }>('SELECT source_id FROM workouts WHERE source_id IS NOT NULL')).map((r) => r.source_id),
    async startWorkout(input: { id?: string; split?: string; ts?: string; tz_offset_min?: number; unit: WeightUnit; programme_id?: string | null; day_key?: string | null; day_name?: string; source?: string; source_id?: string | null; finished_at?: string | null; notes?: string; exercises: ExerciseInput[] }): Promise<FullWorkout> {
      const s = stampNow()
      const row: WorkoutRow = stamp({ id: input.id ?? newId(), ts: input.ts ?? s.ts, tz_offset_min: input.tz_offset_min ?? s.tz_offset_min, unit: input.unit, split: input.split ?? '', notes: input.notes ?? '', programme_id: input.programme_id ?? null, day_key: input.day_key ?? null, day_name: input.day_name ?? '', finished_at: input.finished_at ?? null, source: input.source ?? 'app', source_id: input.source_id ?? null })
      await insertRow(db, 'workouts', row)
      let i = 0
      for (const e of input.exercises) await repo.addExercise(row.id, e, i++)
      return (await repo.workout(row.id))!
    },
    updateWorkout: (id: string, patch: Partial<Omit<WorkoutRow, 'id' | 'created_at'>>) => updateRow(db, 'workouts', id, { ...patch, updated_at: nowIso() }),
    async addExercise(workoutId: string, e: ExerciseInput, position?: number): Promise<FullExercise> {
      const pos = position ?? ((await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM workout_exercises WHERE workout_id = ?', [workoutId]))[0]?.n ?? 0)
      const row: WorkoutExerciseRow = stamp({ id: newId(), workout_id: workoutId, position: pos, exercise_id: e.exercise_id, name: e.name, muscle: e.muscle, method: e.method ?? '', brand: e.brand ?? '', grip: e.grip ?? '', notes: e.notes ?? '', superset: e.superset ?? null })
      await insertRow(db, 'workout_exercises', row)
      const sets: SetRow[] = []
      let i = 0
      for (const s of e.sets ?? []) sets.push(await repo.addSet(row.id, { ...s, position: i++ }))
      return { ...row, sets }
    },
    updateExercise: (id: string, patch: Partial<Omit<WorkoutExerciseRow, 'id' | 'created_at'>>) => updateRow(db, 'workout_exercises', id, { ...patch, updated_at: nowIso() }),
    removeExercise: (id: string) => deleteRow(db, 'workout_exercises', id),
    async addSet(exerciseId: string, init: Partial<Omit<SetRow, 'id' | 'workout_exercise_id' | 'created_at' | 'updated_at'>> = {}): Promise<SetRow> {
      const pos = init.position ?? ((await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM workout_sets WHERE workout_exercise_id = ?', [exerciseId]))[0]?.n ?? 0)
      const row: SetRow = stamp({ id: newId(), workout_exercise_id: exerciseId, position: pos, weight: init.weight ?? null, reps: init.reps ?? null, rir: init.rir ?? null, done: init.done ?? 0, drops: init.drops ?? '[]' })
      await insertRow(db, 'workout_sets', row)
      return row
    },
    updateSet: (id: string, patch: Partial<Omit<SetRow, 'id' | 'created_at'>>) => updateRow(db, 'workout_sets', id, { ...patch, updated_at: nowIso() }),
    removeSet: (id: string) => deleteRow(db, 'workout_sets', id),
    /** Drops empty sets and exercises, stamps the finish, logs the session, updates PBs and the programme log. */
    async finishWorkout(id: string, finishedAt = nowIso()): Promise<FullWorkout | null> {
      const w = await repo.workout(id)
      if (!w) return null
      for (const e of w.exercises) {
        for (const s of e.sets) if (!hasData(s)) await deleteRow(db, 'workout_sets', s.id)
        if (!e.sets.some(hasData)) await deleteRow(db, 'workout_exercises', e.id)
      }
      await repo.updateWorkout(id, { finished_at: finishedAt })
      const full = (await repo.workout(id))!
      await repo.logWorkout(full)
      for (const e of full.exercises) if (PB_EXERCISE_IDS.includes(e.exercise_id)) await repo.considerPb(e.exercise_id, e.sets, full.ts.slice(0, 10))
      if (full.programme_id && full.day_key) {
        const p = await repo.programme(full.programme_id)
        if (p) await repo.updateProgramme(p.id, { log: JSON.stringify([...repo.programmeLog(p), { dayKey: full.day_key, dayName: full.day_name, date: full.ts.slice(0, 10), at: full.ts, workoutId: full.id }]) })
      }
      return full
    },
    /** One `workout` entry per finished workout (replaced on re-finish or edit). */
    async logWorkout(w: FullWorkout): Promise<void> {
      const existing = await db.query<{ id: string }>('SELECT id FROM log_entries WHERE entity_type = ? AND entity_id = ?', [WORKOUT_ENTITY, w.id])
      for (const e of existing) await logs.remove(e.id)
      if (w.exercises.length === 0) return
      const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0)
      await logs.add({ type: LOG.workout, module: 'fitness', ts: w.ts, ts_end: w.finished_at && w.finished_at > w.ts ? w.finished_at : null, tz_offset_min: w.tz_offset_min, value: sets, unit: 'sets', entity_type: WORKOUT_ENTITY, entity_id: w.id, payload: { split: w.split, exercises: w.exercises.length, volume: sessionVolume(w.exercises), muscles: [...new Set(w.exercises.map((e) => e.muscle))], unit: w.unit } })
    },
    async deleteWorkout(id: string): Promise<void> {
      const existing = await db.query<{ id: string }>('SELECT id FROM log_entries WHERE entity_type = ? AND entity_id = ?', [WORKOUT_ENTITY, id])
      for (const e of existing) await logs.remove(e.id)
      await deleteRow(db, 'workouts', id)
    },
    /** Most recent finished occurrence of an exercise (before `beforeTs` when given). */
    async lastFor(exerciseId: string, beforeTs?: string): Promise<{ workout: WorkoutRow; exercise: WorkoutExerciseRow; sets: SetRow[] } | null> {
      return (await repo.historyFor(exerciseId, 1, beforeTs))[0] ?? null
    },
    async historyFor(exerciseId: string, limit = 50, beforeTs?: string): Promise<{ workout: WorkoutRow; exercise: WorkoutExerciseRow; sets: SetRow[] }[]> {
      const rows = await db.query<WorkoutExerciseRow & { w_ts: string }>(`SELECT e.*, w.ts AS w_ts FROM workout_exercises e JOIN workouts w ON w.id = e.workout_id WHERE e.exercise_id = ? AND w.finished_at IS NOT NULL ${beforeTs ? 'AND w.ts < ?' : ''} ORDER BY w.ts DESC LIMIT ?`, beforeTs ? [exerciseId, beforeTs, limit] : [exerciseId, limit])
      const out = []
      for (const e of rows) {
        const workout = (await getRow<WorkoutRow>(db, 'workouts', e.workout_id))!
        const sets = await db.query<SetRow>('SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY position', [e.id])
        out.push({ workout, exercise: e, sets })
      }
      return out
    },
    // bodyweight: one entry per calendar day
    async logBodyweight(value: number, unit: WeightUnit, day: LocalDay = calendarDay()): Promise<LogEntry> {
      const r = dayRange(day)
      const existing = (await logs.listByType(LOG.bodyweight, r.from, r.to))[0]
      if (existing) {
        await logs.update(existing.id, { value, unit })
        return (await logs.get(existing.id))!
      }
      const ts = day === calendarDay() ? new Date() : new Date(`${day}T08:00:00`)
      return logs.add({ type: LOG.bodyweight, module: 'fitness', ts: ts.toISOString(), tz_offset_min: tzOffsetMin(ts), value, unit })
    },
    bodyweights: (fromTs = '1970-01-01T00:00:00.000Z') => logs.listByType(LOG.bodyweight, fromTs, '9999-12-31T00:00:00.000Z'),
    latestBodyweight: () => logs.lastOfType(LOG.bodyweight),
    // activities
    logActivity: (a: { type: string; name?: string | null; minutes: number; seconds?: number | null; distance_km?: number | null; rpe?: number | null; ts?: string; entity_id?: string | null }) =>
      logs.add({ type: LOG.activity, module: 'fitness', ts: a.ts, value: a.minutes, unit: 'min', entity_type: a.entity_id ? 'ironlog.activity' : null, entity_id: a.entity_id ?? null, payload: { type: a.type, name: a.name ?? null, distance_km: a.distance_km ?? null, rpe: a.rpe ?? null, seconds: a.seconds ?? null } }),
    activities: (fromTs: string) => logs.listByType(LOG.activity, fromTs, '9999-12-31T00:00:00.000Z'),
    // programmes
    programmes: () => db.query<ProgrammeRow>(`SELECT * FROM programmes ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC`),
    programme: (id: string) => getRow<ProgrammeRow>(db, 'programmes', id),
    activeProgramme: async () => (await db.query<ProgrammeRow>(`SELECT * FROM programmes WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`))[0] ?? null,
    async addProgramme(input: { id?: string; name: string; preset_key?: string; weeks: number; days: ProgrammeDay[]; log?: ProgrammeLogEntry[]; status?: 'active' | 'finished'; finished_at?: string | null; ended_early?: number; source_id?: string | null; created_at?: string }): Promise<ProgrammeRow> {
      const t = nowIso()
      const row: ProgrammeRow = { id: input.id ?? newId(), name: input.name.trim(), preset_key: input.preset_key ?? '', weeks: input.weeks, days: JSON.stringify(input.days), log: JSON.stringify(input.log ?? []), status: input.status ?? 'active', ended_early: input.ended_early ?? 0, finished_at: input.finished_at ?? null, source_id: input.source_id ?? null, created_at: input.created_at ?? t, updated_at: t }
      await insertRow(db, 'programmes', row)
      return row
    },
    updateProgramme: (id: string, patch: Partial<Omit<ProgrammeRow, 'id' | 'created_at'>>) => updateRow(db, 'programmes', id, { ...patch, updated_at: nowIso() }),
    finishProgramme: (id: string, endedEarly: boolean) => updateRow(db, 'programmes', id, { status: 'finished', ended_early: endedEarly ? 1 : 0, finished_at: nowIso(), updated_at: nowIso() }),
    removeProgramme: (id: string) => deleteRow(db, 'programmes', id),
    programmeDays: (p: ProgrammeRow): ProgrammeDay[] => parseJson<ProgrammeDay[]>(p.days, []),
    programmeLog: (p: ProgrammeRow): ProgrammeLogEntry[] => parseJson<ProgrammeLogEntry[]>(p.log, []),
    // templates
    templates: () => db.query<TemplateRow>('SELECT * FROM workout_templates ORDER BY created_at DESC'),
    async addTemplate(input: { id?: string; name: string; split?: string; exercises: { id: string; muscle: string }[]; selection?: Record<string, number>; source_id?: string | null }): Promise<TemplateRow> {
      const row: TemplateRow = stamp({ id: input.id ?? newId(), name: input.name.trim(), split: input.split ?? '', exercises: JSON.stringify(input.exercises), selection: JSON.stringify(input.selection ?? {}), source_id: input.source_id ?? null })
      await insertRow(db, 'workout_templates', row)
      return row
    },
    removeTemplate: (id: string) => deleteRow(db, 'workout_templates', id),
    templateExercises: (t: TemplateRow) => parseJson<{ id: string; muscle: string }[]>(t.exercises, []),
    // records and goals
    records: () => db.query<RecordRow>('SELECT * FROM fitness_records ORDER BY exercise_id, kind'),
    record: async (exerciseId: string, kind: RecordRow['kind']) => (await db.query<RecordRow>('SELECT * FROM fitness_records WHERE exercise_id = ? AND kind = ?', [exerciseId, kind]))[0] ?? null,
    async setRecord(exerciseId: string, kind: RecordRow['kind'], v: { weight?: number | null; reps?: number | null; value?: number | null; day?: LocalDay | null; note?: string }): Promise<void> {
      const existing = await repo.record(exerciseId, kind)
      if (existing) await updateRow(db, 'fitness_records', existing.id, { weight: v.weight ?? null, reps: v.reps ?? null, value: v.value ?? null, day: v.day ?? null, note: v.note ?? '', updated_at: nowIso() })
      else await insertRow(db, 'fitness_records', stamp({ id: newId(), exercise_id: exerciseId, kind, weight: v.weight ?? null, reps: v.reps ?? null, value: v.value ?? null, day: v.day ?? null, note: v.note ?? '' }))
    },
    async considerPb(exerciseId: string, sets: SetRow[], day: LocalDay): Promise<boolean> {
      const top = topSet(sets.filter(hasData))
      const stored = await repo.record(exerciseId, 'pb')
      if (!beatsRecord(top, stored)) return false
      await repo.setRecord(exerciseId, 'pb', { weight: top!.weight, reps: top!.reps, day })
      return true
    },
    goals: () => db.query<GoalRow>('SELECT * FROM fitness_goals ORDER BY created_at'),
    async setGoal(exerciseId: string, v: Partial<Omit<GoalRow, 'id' | 'exercise_id' | 'created_at' | 'updated_at'>>): Promise<void> {
      const existing = (await db.query<GoalRow>('SELECT * FROM fitness_goals WHERE exercise_id = ?', [exerciseId]))[0]
      if (existing) await updateRow(db, 'fitness_goals', existing.id, { ...v, updated_at: nowIso() })
      else await insertRow(db, 'fitness_goals', stamp({ id: newId(), exercise_id: exerciseId, current: v.current ?? null, target: v.target ?? null, level: v.level ?? '', weeks: v.weeks ?? null, is_bodyweight: v.is_bodyweight ?? 0, milestones: v.milestones ?? '[]' }))
    },
    removeGoal: (id: string) => deleteRow(db, 'fitness_goals', id),
  }
  return repo
}

export type FitnessRepo = ReturnType<typeof fitnessRepo>
