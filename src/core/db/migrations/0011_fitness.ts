import type { Migration } from './types'

/**
 * Stage 10: fitness (the Iron Log port). Workouts are rows with exercises and sets; each finished
 * workout also writes a `workout` log entry so insights see it. Bodyweight and cardio activities
 * are log entries only. Programmes, templates, custom exercises, records and goals are small tables.
 * `source`/`source_id` make the Iron Log importer idempotent.
 */
export const m0011: Migration = {
  version: 11,
  name: 'fitness',
  tables: ['fitness_exercises', 'workouts', 'workout_exercises', 'workout_sets', 'programmes', 'workout_templates', 'fitness_records', 'fitness_goals'],
  statements: [
    `CREATE TABLE fitness_exercises (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      muscle TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'compound' CHECK (type IN ('compound','isolation','mobility')),
      pattern TEXT NOT NULL DEFAULT '',
      cue TEXT NOT NULL DEFAULT '',
      secondary TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE workouts (
      id TEXT PRIMARY KEY NOT NULL,
      ts TEXT NOT NULL,
      tz_offset_min INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg','lb')),
      split TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      programme_id TEXT,
      day_key TEXT,
      day_name TEXT NOT NULL DEFAULT '',
      finished_at TEXT,
      source TEXT NOT NULL DEFAULT 'app',
      source_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_workouts_ts ON workouts(ts)`,
    `CREATE INDEX idx_workouts_source ON workouts(source_id)`,
    `CREATE TABLE workout_exercises (
      id TEXT PRIMARY KEY NOT NULL,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      exercise_id TEXT NOT NULL,
      name TEXT NOT NULL,
      muscle TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT '',
      brand TEXT NOT NULL DEFAULT '',
      grip TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      superset TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_wex_workout ON workout_exercises(workout_id, position)`,
    `CREATE INDEX idx_wex_exercise ON workout_exercises(exercise_id)`,
    `CREATE TABLE workout_sets (
      id TEXT PRIMARY KEY NOT NULL,
      workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      weight REAL,
      reps REAL,
      rir INTEGER,
      done INTEGER NOT NULL DEFAULT 0,
      drops TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_wsets_exercise ON workout_sets(workout_exercise_id, position)`,
    `CREATE TABLE programmes (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      preset_key TEXT NOT NULL DEFAULT '',
      weeks INTEGER NOT NULL DEFAULT 6,
      days TEXT NOT NULL DEFAULT '[]',
      log TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','finished')),
      ended_early INTEGER NOT NULL DEFAULT 0,
      finished_at TEXT,
      source_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE workout_templates (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      split TEXT NOT NULL DEFAULT '',
      exercises TEXT NOT NULL DEFAULT '[]',
      selection TEXT NOT NULL DEFAULT '{}',
      source_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE fitness_records (
      id TEXT PRIMARY KEY NOT NULL,
      exercise_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('pb','manual_1rm')),
      weight REAL,
      reps REAL,
      value REAL,
      day TEXT,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (exercise_id, kind)
    )`,
    `CREATE TABLE fitness_goals (
      id TEXT PRIMARY KEY NOT NULL,
      exercise_id TEXT NOT NULL UNIQUE,
      current REAL,
      target REAL,
      level TEXT NOT NULL DEFAULT '',
      weeks INTEGER,
      is_bodyweight INTEGER NOT NULL DEFAULT 0,
      milestones TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ],
  fixtures: () => {
    const t = '2026-10-06T18:30:00.000Z'
    return {
      fitness_exercises: [{ id: 'custom-landmine-press', name: 'Landmine Press', muscle: 'Chest', type: 'compound', pattern: 'press', cue: '', secondary: '["Front Delts","Triceps"]', created_at: t, updated_at: t }],
      workouts: [
        { id: 'w-1', ts: '2026-10-06T17:30:00.000Z', tz_offset_min: 60, unit: 'kg', split: 'Push', notes: '', programme_id: 'pg-fit-1', day_key: 'd0', day_name: 'Push', finished_at: t, source: 'app', source_id: null, created_at: t, updated_at: t },
        { id: 'w-2', ts: '2026-10-08T17:30:00.000Z', tz_offset_min: 60, unit: 'kg', split: 'Pull', notes: 'unfinished', programme_id: null, day_key: null, day_name: '', finished_at: null, source: 'app', source_id: null, created_at: t, updated_at: t },
      ],
      workout_exercises: [
        { id: 'we-1', workout_id: 'w-1', position: 0, exercise_id: 'bench-press', name: 'Bench Press', muscle: 'Chest', method: 'Barbell', brand: '', grip: '', notes: '', superset: null, created_at: t, updated_at: t },
        { id: 'we-2', workout_id: 'w-1', position: 1, exercise_id: 'lateral-raise', name: 'Lateral Raise', muscle: 'Side Delts', method: '', brand: '', grip: '', notes: 'slow', superset: 'A', created_at: t, updated_at: t },
        { id: 'we-3', workout_id: 'w-2', position: 0, exercise_id: 'pull-ups', name: 'Pull-Up', muscle: 'Back', method: 'Bodyweight', brand: '', grip: '', notes: '', superset: null, created_at: t, updated_at: t },
      ],
      workout_sets: [
        { id: 'ws-1', workout_exercise_id: 'we-1', position: 0, weight: 80, reps: 8, rir: 2, done: 1, drops: '[]', created_at: t, updated_at: t },
        { id: 'ws-2', workout_exercise_id: 'we-1', position: 1, weight: 80, reps: 7, rir: 1, done: 1, drops: '[{"weight":60,"reps":6}]', created_at: t, updated_at: t },
        { id: 'ws-3', workout_exercise_id: 'we-2', position: 0, weight: 10, reps: 15, rir: null, done: 1, drops: '[]', created_at: t, updated_at: t },
        { id: 'ws-4', workout_exercise_id: 'we-3', position: 0, weight: null, reps: 8, rir: null, done: 0, drops: '[]', created_at: t, updated_at: t },
      ],
      programmes: [{ id: 'pg-fit-1', name: 'Push Pull Legs', preset_key: 'ppl', weeks: 6, days: '[{"key":"d0","name":"Push","muscles":["Chest","Front Delts","Side Delts","Triceps"],"exercises":[{"id":"bench-press","name":"Bench Press","muscle":"Chest","type":"compound"},{"id":"lateral-raise","name":"Lateral Raise","muscle":"Side Delts","type":"isolation"}]}]', log: '[{"dayKey":"d0","dayName":"Push","date":"2026-10-06","at":"2026-10-06T17:30:00.000Z","workoutId":"w-1"}]', status: 'active', ended_early: 0, finished_at: null, source_id: null, created_at: t, updated_at: t }],
      workout_templates: [{ id: 'wt-1', name: 'Quick push', split: 'Push', exercises: '[{"id":"bench-press","muscle":"Chest"},{"id":"pushdown","muscle":"Triceps"}]', selection: '{}', source_id: null, created_at: t, updated_at: t }],
      fitness_records: [{ id: 'fr-1', exercise_id: 'bench-press', kind: 'pb', weight: 85, reps: 5, value: null, day: '2026-09-20', note: '', created_at: t, updated_at: t }],
      fitness_goals: [{ id: 'fg-1', exercise_id: 'bench-press', current: 99, target: 110, level: 'intermediate', weeks: 12, is_bodyweight: 0, milestones: '[]', created_at: t, updated_at: t }],
      log_entries: [
        { id: 'l-12', type: 'workout', module: 'fitness', ts: '2026-10-06T17:30:00.000Z', ts_end: '2026-10-06T18:30:00.000Z', tz_offset_min: 60, value: 3, unit: 'sets', payload: '{"split":"Push","exercises":2,"volume":1430,"muscles":["Chest","Side Delts"],"unit":"kg"}', entity_type: 'fitness.workout', entity_id: 'w-1', created_at: t, updated_at: t },
        { id: 'l-13', type: 'bodyweight', module: 'fitness', ts: '2026-10-06T07:00:00.000Z', ts_end: null, tz_offset_min: 60, value: 81.4, unit: 'kg', payload: '{}', entity_type: null, entity_id: null, created_at: t, updated_at: t },
        { id: 'l-14', type: 'activity', module: 'fitness', ts: '2026-10-07T07:00:00.000Z', ts_end: null, tz_offset_min: 60, value: 32, unit: 'min', payload: '{"type":"run","name":null,"distance_km":5.2,"rpe":6,"seconds":1920}', entity_type: null, entity_id: null, created_at: t, updated_at: t },
      ],
    }
  },
}
