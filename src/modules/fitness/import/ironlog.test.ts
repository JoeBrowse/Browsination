import { describe, expect, it } from 'vitest'
import { settingsRepo } from '@/core/repos/settings'
import { makeTestDb } from '@/test/db'
import { fitnessRepo } from '../repo'
import { applyImport, loadExisting } from './apply'
import { parseBackup, planImport } from './ironlog'

/** A backup in the shape Iron Log v1.23 writes, with one of everything and one older exercise-history session. */
const BACKUP = {
  format: 1,
  app: 'Iron Log',
  version: '1.23.0',
  exportedAt: '2026-10-01T10:00:00.000Z',
  data: {
    'schema-version': 9,
    license: { trialStartedAt: '2026-01-01T00:00:00.000Z', purchased: true },
    settings: { weightUnit: 'kg', restCompound: 150, restIsolation: 60, startingSets: 2, recoveryPace: 'slower', theme: 'dark' },
    'workout-history': [
      {
        id: '2026-09-28-1',
        date: '2026-09-28',
        at: '2026-09-28T17:00:00.000Z',
        split: 'Push',
        programmeId: 'prog-1',
        dayKey: 'd0',
        dayName: 'Push',
        supersets: [{ id: 'ss1', color: '#fff', exIds: ['bench-press', 'lateral-raise'] }],
        exercises: [
          { id: 'bench-press', name: 'Bench Press', muscle: 'Chest', method: 'Barbell', sets: [{ weight: '80', reps: '8', rir: 2 }, { weight: '80', reps: '6', rir: 1, drops: [{ weight: '60', reps: '5' }] }] },
          { id: 'lateral-raise', name: 'Lateral Raise', muscle: 'Side Delts', notes: 'slow', sets: [{ weight: '10', reps: '15' }] },
          { id: 'weird-machine', name: 'Weird Machine', muscle: 'Chest', sets: [{ weight: '40', reps: '12' }] },
        ],
      },
      { id: '2026-09-30-2', date: '2026-09-30', at: '2026-09-30T17:00:00.000Z', split: 'Pull', exercises: [{ id: 'pull-ups', name: 'Pull-Up', muscle: 'Back', sets: [{ weight: '', reps: '8' }, { weight: '', reps: '' }] }] },
    ],
    'ex-history:bench-press': [
      { date: '2026-01-10', at: '2026-01-10T18:00:00.000Z', sets: [{ weight: '70', reps: '8' }], order: 1, total: 2 },
      { date: '2026-09-28', at: '2026-09-28T17:00:00.000Z', sets: [{ weight: '80', reps: '8', rir: 2 }], order: 1, total: 3 },
    ],
    'ex-history:squat': [{ date: '2026-01-10', at: '2026-01-10T18:00:00.000Z', sets: [{ weight: '100', reps: '5' }], order: 2, total: 2 }],
    'in-progress-workout': { split: 'Legs', exercises: [{ id: 'squat', name: 'Squat', muscle: 'Quads' }], sets: { squat: [{ weight: '100', reps: '5', done: true }, { weight: '', reps: '', done: false }] }, workoutDate: '2026-10-01T09:00:00.000Z', startedAt: '2026-10-01T09:00:00.000Z' },
    'pb:bench-press': { exerciseId: 'bench-press', name: 'Bench Press', weight: '85', reps: '5', date: '2026-08-01' },
    'manual-1rm:squat': { value: 140, date: '2026-07-01' },
    '1rm-goals': { 'bench-press': { exerciseId: 'bench-press', current: 99, target: 110, level: 'intermediate', weeks: 12, isBodyweight: false, createdAt: '2026-09-01T00:00:00.000Z', milestones: [{ week: 4, target: 103 }] } },
    bodyweight: { value: 81.4, unit: 'kg', date: '2026-09-30' },
    'bodyweight-history': [
      { value: 82, unit: 'kg', date: '2026-09-01' },
      { value: 81.4, unit: 'kg', date: '2026-09-30' },
    ],
    'weight-tracking': { enabled: true, goal: 80, unit: 'kg' },
    'personal-stats': { height: 180 },
    'activity-history': [{ id: 'act-1', date: '2026-09-29', at: '2026-09-29T07:00:00.000Z', type: 'run', name: null, minutes: 32, seconds: 10, distance: 5.2, rpe: 6 }],
    templates: [{ id: 'tpl-1', name: 'Quick push', split: 'Push', mode: 'specific', exercises: [{ id: 'bench-press', muscle: 'Chest' }], createdAt: '2026-09-01' }],
    'active-programme': { id: 'prog-1', name: 'PPL', presetKey: 'ppl', createdAt: '2026-09-20T00:00:00.000Z', weeks: 6, days: [{ key: 'd0', name: 'Push', muscles: ['Chest'], exercises: [{ id: 'bench-press', name: 'Bench Press', muscle: 'Chest', type: 'compound' }] }], log: [{ dayKey: 'd0', dayName: 'Push', date: '2026-09-28', at: '2026-09-28T17:00:00.000Z', sessionId: '2026-09-28-1' }] },
    'finished-programmes': [{ id: 'prog-0', name: 'Old block', presetKey: 'full-body', createdAt: '2026-05-01T00:00:00.000Z', weeks: 4, days: [], log: [], finishedAt: '2026-06-01T00:00:00.000Z', endedEarly: true }],
    'custom-exercises': [{ id: 'custom-landmine', name: 'Landmine Press', muscle: 'Chest', type: 'compound' }],
    'hidden-exercises': ['dips'],
    'exercise-order': { Chest: ['bench-press'] },
  },
}

describe('Iron Log import', () => {
  it('rejects anything that is not an Iron Log backup', () => {
    expect(() => parseBackup('nope')).toThrow('Not a JSON')
    expect(() => parseBackup('{"format":2,"data":{}}')).toThrow('format 1')
    expect(() => parseBackup('{"format":1,"app":"Other","data":{}}')).toThrow('not Iron Log')
    expect(parseBackup(JSON.stringify(BACKUP)).data['settings']).toBeTruthy()
  })

  it('plans every row from a backup and reports what it leaves out', async () => {
    const db = await makeTestDb()
    const repo = fitnessRepo(db)
    const plan = planImport(parseBackup(JSON.stringify(BACKUP)), await loadExisting(repo))
    // two sessions plus one rebuilt from exercise history (January, no session covers it)
    expect(plan.workouts).toHaveLength(3)
    const rebuilt = plan.workouts.find((w) => w.source === 'ironlog-history')!
    expect(rebuilt.exercises.map((e) => e.exercise_id).sort()).toEqual(['bench-press', 'squat'])
    const push = plan.workouts.find((w) => w.source_id === '2026-09-28-1')!
    expect(push.programme_id).toBe(plan.programmes.find((p) => p.source_id === 'prog-1')!.id)
    expect(push.exercises[0]!.superset).toBe('A')
    expect(push.exercises[0]!.sets![1]!.drops).toBe('[{"weight":60,"reps":5}]')
    expect(push.exercises[1]!.notes).toBe('slow')
    // the empty set is dropped, the bodyweight pull-up keeps reps only
    expect(plan.workouts.find((w) => w.source_id === '2026-09-30-2')!.exercises[0]!.sets).toEqual([{ weight: null, reps: 8, rir: null, done: 1, drops: '[]' }])
    expect(plan.inProgress!.exercises[0]!.sets).toEqual([{ weight: 100, reps: 5, rir: null, done: 1, drops: '[]' }])
    expect(plan.customExercises.map((c) => c.id).sort()).toEqual(['custom-landmine', 'weird-machine'])
    expect(plan.warnings.some((w) => w.includes('Weird Machine'))).toBe(true)
    expect(plan.bodyweights).toHaveLength(2)
    expect(plan.activities[0]).toMatchObject({ entity_id: 'act-1', type: 'run', distance_km: 5.2, rpe: 6 })
    expect(plan.activities[0]!.minutes).toBeCloseTo(32.17, 1)
    expect(plan.templates).toHaveLength(1)
    expect(plan.programmes).toHaveLength(2)
    expect(plan.programmes.find((p) => p.source_id === 'prog-1')!.log[0]!.workoutId).toBe(push.id)
    expect(plan.records).toHaveLength(2)
    expect(plan.goals[0]).toMatchObject({ exercise_id: 'bench-press', target: 110, weeks: 12 })
    expect(plan.settings).toEqual({ 'fitness.weightUnit': 'kg', 'fitness.restCompound': 150, 'fitness.restIsolation': 60, 'fitness.startingSets': 2, 'fitness.recoveryPace': 'slower', 'fitness.weightGoal': 80, 'fitness.heightCm': 180 })
    expect(plan.ignoredKeys.sort()).toEqual(['exercise-order', 'hidden-exercises', 'license', 'schema-version'])
  })

  it('writes the plan and is a no-op the second time', async () => {
    const db = await makeTestDb()
    const repo = fitnessRepo(db)
    const settings = settingsRepo(db)
    const backup = parseBackup(JSON.stringify(BACKUP))
    const first = await applyImport(repo, settings, planImport(backup, await loadExisting(repo)))
    expect(first.workouts).toBe(3)
    expect(first.sets).toBe(7)
    const workouts = await repo.recentFull()
    expect(workouts).toHaveLength(3)
    const push = workouts.find((w) => w.source_id === '2026-09-28-1')!
    expect(push.exercises).toHaveLength(3)
    expect(push.exercises[0]!.sets[1]!.drops).toBe('[{"weight":60,"reps":5}]')
    expect(await repo.inProgress()).not.toBeNull()
    expect((await repo.logs.listByType('workout', '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z')).length).toBe(3)
    expect((await repo.bodyweights()).map((b) => b.value)).toEqual([82, 81.4])
    expect(await repo.activities('2026-01-01T00:00:00.000Z')).toHaveLength(1)
    expect(await repo.templates()).toHaveLength(1)
    expect((await repo.programmes()).map((p) => p.status).sort()).toEqual(['active', 'finished'])
    expect((await repo.record('bench-press', 'pb'))?.weight).toBe(85)
    expect((await repo.record('squat', 'manual_1rm'))?.value).toBe(140)
    expect(await repo.goals()).toHaveLength(1)
    expect(await settings.get('fitness.restCompound')).toBe(150)
    expect(await settings.get('fitness.weightGoal')).toBe(80)
    // the January bench set (70x8) never beats the stored 85x5 PB
    expect((await repo.record('bench-press', 'pb'))?.reps).toBe(5)

    const again = planImport(backup, await loadExisting(repo))
    expect(again.workouts).toHaveLength(0)
    expect(again.skipped).toEqual({ workouts: 3, programmes: 2, templates: 1, activities: 1, inProgress: 1 })
    await applyImport(repo, settings, again)
    expect(await repo.recentFull()).toHaveLength(3)
    expect((await repo.bodyweights()).length).toBe(2)
  })
})
