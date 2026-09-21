import type { SettingsRepo } from '@/core/repos/settings'
import type { FitnessRepo } from '../repo'
import { summarise, type Existing, type ImportPlan, type ImportSummary } from './ironlog'

/** What the planner needs to know about rows already in the database, so a re-run adds nothing twice. */
export async function loadExisting(repo: FitnessRepo): Promise<Existing> {
  const [workouts, programmes, templates, activities, custom, inProgress] = await Promise.all([repo.workoutSourceIds(), repo.programmes(), repo.templates(), repo.activities('1970-01-01T00:00:00.000Z'), repo.customExercises(), repo.inProgress()])
  return {
    workoutSourceIds: new Set(workouts),
    programmeSourceIds: new Set(programmes.map((p) => p.source_id).filter((x): x is string => !!x)),
    templateSourceIds: new Set(templates.map((t) => t.source_id).filter((x): x is string => !!x)),
    activityIds: new Set(activities.map((a) => a.entity_id).filter((x): x is string => !!x)),
    inProgress: inProgress !== null,
    customExerciseIds: new Set(custom.map((c) => c.id)),
  }
}

/**
 * Writes the plan row by row (the driver serialises writes). The caller takes a snapshot first,
 * and because every row is matched on its Iron Log id, running the same file again adds nothing.
 */
export async function applyImport(repo: FitnessRepo, settings: SettingsRepo, plan: ImportPlan): Promise<ImportSummary> {
  for (const c of plan.customExercises) await repo.addCustomExercise({ id: c.id, name: c.name, muscle: c.muscle, type: c.type, pattern: c.pattern, cue: c.cue, secondary: JSON.stringify(c.secondary) })
  for (const p of plan.programmes) await repo.addProgramme({ id: p.id, name: p.name, preset_key: p.preset_key, weeks: p.weeks, days: p.days, log: p.log, status: p.status, finished_at: p.finished_at, ended_early: p.ended_early, source_id: p.source_id, created_at: p.created_at })
  for (const w of plan.workouts) {
    const saved = await repo.startWorkout({ id: w.id, ts: w.ts, tz_offset_min: w.tz_offset_min, unit: w.unit, split: w.split, notes: w.notes, programme_id: w.programme_id, day_key: w.day_key, day_name: w.day_name, source: w.source, source_id: w.source_id, finished_at: w.finished_at, exercises: w.exercises })
    await repo.logWorkout(saved)
    for (const e of saved.exercises) await repo.considerPb(e.exercise_id, e.sets, saved.ts.slice(0, 10))
  }
  if (plan.inProgress) {
    const w = plan.inProgress
    await repo.startWorkout({ id: w.id, ts: w.ts, tz_offset_min: w.tz_offset_min, unit: w.unit, split: w.split, source: w.source, source_id: w.source_id, finished_at: null, exercises: w.exercises })
  }
  for (const b of plan.bodyweights) await repo.logBodyweight(b.value, b.unit, b.day)
  for (const a of plan.activities) await repo.logActivity({ type: a.type, name: a.name, minutes: a.minutes, seconds: a.seconds, distance_km: a.distance_km, rpe: a.rpe, ts: a.ts, entity_id: a.entity_id })
  for (const t of plan.templates) await repo.addTemplate({ name: t.name, split: t.split, exercises: t.exercises, selection: t.selection, source_id: t.source_id })
  for (const r of plan.records) await repo.setRecord(r.exercise_id, r.kind, { weight: r.weight, reps: r.reps, value: r.value, day: r.day })
  for (const g of plan.goals) await repo.setGoal(g.exercise_id, { current: g.current, target: g.target, level: g.level, weeks: g.weeks, is_bodyweight: g.is_bodyweight, milestones: JSON.stringify(g.milestones) })
  for (const [k, v] of Object.entries(plan.settings)) await settings.set(k as never, v as never)
  return summarise(plan)
}
