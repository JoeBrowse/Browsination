import type { Migration } from './types'

/**
 * Stage 8: work and side projects. Projects (day job and side, `area`), key dates as JSON,
 * next actions are items (entity_type 'work.project'). People reuse the `people` table with a
 * context, role and "cares about"; 1:1 notes are dated rows. Progression items (goal, skill,
 * milestone) with an evidence log for appraisals; a learning list.
 */
export const m0009: Migration = {
  version: 9,
  name: 'work',
  tables: ['projects', 'one_on_ones', 'progression_items', 'evidence', 'learning_items'],
  statements: [
    `ALTER TABLE people ADD COLUMN context TEXT NOT NULL DEFAULT 'personal'`,
    `ALTER TABLE people ADD COLUMN role TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE people ADD COLUMN cares_about TEXT NOT NULL DEFAULT ''`,
    `CREATE TABLE projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      client TEXT NOT NULL DEFAULT '',
      area TEXT NOT NULL DEFAULT 'work' CHECK (area IN ('work','side')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('idea','active','paused','done')),
      key_dates TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_projects_area ON projects(area, status)`,
    `CREATE TABLE one_on_ones (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      day TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_one_on_ones_person ON one_on_ones(person_id, day)`,
    `CREATE TABLE progression_items (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('goal','skill','milestone')),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','done','dropped')),
      target_date TEXT,
      done_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE evidence (
      id TEXT PRIMARY KEY NOT NULL,
      day TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'achievement' CHECK (kind IN ('achievement','feedback')),
      title TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      progression_id TEXT REFERENCES progression_items(id) ON DELETE SET NULL,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_evidence_day ON evidence(day)`,
    `CREATE TABLE learning_items (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'book' CHECK (kind IN ('book','course','article','video','other')),
      status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done','dropped')),
      url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      finished_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ],
  fixtures: () => {
    const t = '2026-10-01T09:00:00.000Z'
    return {
      people: [{ id: 'p-2', name: 'Priya', relationship: '', birthday: null, notes: '', last_contacted_at: null, keep_in_touch_days: null, context: 'work', role: 'Line manager', cares_about: 'Delivery dates, clear updates', created_at: t, updated_at: t }],
      projects: [
        { id: 'pr-1', name: 'Bridge inspection', client: 'Council', area: 'work', status: 'active', key_dates: '[{"label":"Report due","date":"2026-10-20"}]', notes: '', sort_order: 0, created_at: t, updated_at: t },
        { id: 'pr-2', name: 'Browsination', client: '', area: 'side', status: 'active', key_dates: '[]', notes: 'Personal app', sort_order: 1, created_at: t, updated_at: t },
      ],
      items: [
        { id: 'i-4', title: 'Draft report summary', notes: '', module: 'work', status: 'todo', due_date: '2026-10-15', due_time: null, reminder_at: null, recurrence: null, priority: 0, entity_type: 'work.project', entity_id: 'pr-1', created_at: t, updated_at: t, completed_at: null, waiting_person_id: null, chase_date: null, focus_date: null, series_id: null, recur_from: 'due' },
      ],
      one_on_ones: [{ id: 'oo-1', person_id: 'p-2', day: '2026-10-01', notes: 'Asked for chartership support', created_at: t, updated_at: t }],
      progression_items: [
        { id: 'pg-1', kind: 'goal', title: 'Lead a project end to end', status: 'active', target_date: '2027-03-31', done_date: null, notes: '', created_at: t, updated_at: t },
        { id: 'pg-2', kind: 'skill', title: 'Python for data checks', status: 'active', target_date: null, done_date: null, notes: '', created_at: t, updated_at: t },
        { id: 'pg-3', kind: 'milestone', title: 'Chartership application', status: 'active', target_date: '2027-06-01', done_date: null, notes: '', created_at: t, updated_at: t },
      ],
      evidence: [{ id: 'ev-1', day: '2026-10-01', kind: 'feedback', title: 'Clear client update', detail: 'Council praised the summary', source: 'Priya', progression_id: 'pg-1', project_id: 'pr-1', created_at: t, updated_at: t }],
      learning_items: [{ id: 'le-1', title: 'Designing Data-Intensive Applications', kind: 'book', status: 'doing', url: '', notes: '', finished_at: null, created_at: t, updated_at: t }],
    }
  },
}
