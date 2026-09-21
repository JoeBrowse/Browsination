import { describe, expect, it } from 'vitest'
import { beatsRecord, epley, hardestRir, plannedSets, programmeNextIndex, programmeWeek, readiness, sessionVolume, topSet, weeklyVolume } from './logic'

const H = 3_600_000

describe('fitness logic', () => {
  it('epley and top set', () => {
    expect(epley(100, 5)).toBe(117)
    expect(epley(0, 5)).toBe(0)
    expect(topSet([{ weight: 80, reps: 8 }, { weight: 85, reps: 3 }, { weight: 85, reps: 5 }])).toEqual({ weight: 85, reps: 5 })
    expect(topSet([])).toBeNull()
    expect(beatsRecord({ weight: 85, reps: 5 }, { weight: 85, reps: 4 })).toBe(true)
    expect(beatsRecord({ weight: 80, reps: 9 }, { weight: 85, reps: 4 })).toBe(false)
    expect(beatsRecord({ weight: 80, reps: 9 }, null)).toBe(true)
  })
  it('effort and volume', () => {
    expect(hardestRir([{ weight: 1, reps: 1, rir: 3 }, { weight: 1, reps: 1, rir: 1 }, { weight: 1, reps: 1 }])).toBe(1)
    expect(hardestRir([{ weight: 1, reps: 1 }])).toBeNull()
    expect(sessionVolume([{ sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 7 }] }, { sets: [{ weight: null, reps: 10 }] }])).toBe(1200)
  })
  it('readiness runs the recovery windows from the most recent work, direct and indirect', () => {
    const now = Date.parse('2026-10-08T18:00:00Z')
    const sessions = [
      // bench press yesterday evening, hard: chest direct 60h; triceps and front delts indirect hard 36h
      { atMs: now - 20 * H, exercises: [{ muscle: 'Chest', exercise_id: 'bench-press', sets: [{ weight: 80, reps: 8, rir: 1 }] }] },
      // squats four days ago with reps in reserve: quads direct 54h, long clear
      { atMs: now - 96 * H, exercises: [{ muscle: 'Quads', exercise_id: 'squat', sets: [{ weight: 100, reps: 5, rir: 3 }] }] },
    ]
    const r = new Map(readiness(['Chest', 'Triceps', 'Quads', 'Calves'], sessions, [], now).map((x) => [x.muscle, x]))
    expect(r.get('Chest')!.stage).toBe('red')
    expect(Math.round(r.get('Chest')!.hoursLeft)).toBe(40)
    expect(r.get('Triceps')!.stage).toBe('amber')
    expect(r.get('Triceps')!.indirectOnly).toBe(true)
    expect(r.get('Quads')!.stage).toBe('ready')
    expect(r.get('Calves')!.stage).toBe('none')
    // a hard run just now touches quads and calves
    const withRun = new Map(readiness(['Quads', 'Calves'], sessions, [{ atMs: now - H, type: 'run', rpe: 9 }], now).map((x) => [x.muscle, x]))
    expect(withRun.get('Quads')!.stage).toBe('red')
    expect(withRun.get('Calves')!.stage).toBe('red')
    // slower pace stretches the window
    expect(readiness(['Quads'], sessions, [], now, 2)[0]!.stage).toBe('amber')
  })
  it('weekly volume counts secondary muscles as half a set', () => {
    const v = weeklyVolume(['Chest', 'Triceps', 'Front Delts'], [{ atMs: 0, exercises: [{ muscle: 'Chest', exercise_id: 'bench-press', sets: [{ weight: 1, reps: 1 }, { weight: 1, reps: 1 }] }] }])
    expect(v.get('Chest')).toBe(2)
    expect(v.get('Triceps')).toBe(1)
  })
  it('programme next day and week', () => {
    const days = [{ key: 'a', name: 'A', muscles: [], exercises: [] }, { key: 'b', name: 'B', muscles: [], exercises: [] }]
    expect(programmeNextIndex(days, [])).toBe(0)
    expect(programmeNextIndex(days, [{ dayKey: 'a', dayName: 'A', date: '2026-10-01', at: '2026-10-01T10:00:00Z' }])).toBe(1)
    expect(programmeNextIndex(days, [{ dayKey: 'b', dayName: 'B', date: '2026-10-01', at: '2026-10-01T10:00:00Z' }])).toBe(0)
    expect(programmeWeek('2026-10-01T00:00:00Z', [], 6, Date.parse('2026-10-16T00:00:00Z'))).toBe(3)
    expect(programmeWeek('2026-09-01T00:00:00Z', [{ dayKey: 'a', dayName: 'A', date: '2026-10-01', at: '2026-10-01T10:00:00Z' }], 6, Date.parse('2026-10-02T00:00:00Z'))).toBe(1)
    expect(programmeWeek('2026-01-01T00:00:00Z', [], 6, Date.parse('2026-10-02T00:00:00Z'))).toBe(6)
  })
  it('planned sets copy last time unticked or start empty', () => {
    expect(plannedSets([{ weight: 80, reps: 8, rir: 1 }], 1)).toEqual([{ weight: 80, reps: 8, rir: null, done: 0 }])
    expect(plannedSets(null, 3)).toHaveLength(3)
    expect(plannedSets([], 0)).toHaveLength(1)
  })
})
