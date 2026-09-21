import type { SqlDriver } from '@/core/db/driver'
import { newId, nowIso } from '@/core/ids'
import { deleteRow, getRow, insertRow, parseJson, updateRow } from '@/core/repos/base'
import { itemsRepo, type ItemRow } from '@/core/repos/items'
import { peopleRepo, type PersonRow } from '@/core/repos/people'
import type { LocalDay } from '@/core/time/localDay'

export type ProjectArea = 'work' | 'side'
export type ProjectStatus = 'idea' | 'active' | 'paused' | 'done'
export const PROJECT_STATUSES: { label: string; value: ProjectStatus }[] = [
  { label: 'Idea', value: 'idea' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Done', value: 'done' },
]
export interface KeyDate {
  label: string
  date: LocalDay
}
export interface ProjectRow {
  id: string
  name: string
  client: string
  area: ProjectArea
  status: ProjectStatus
  /** JSON KeyDate[] */
  key_dates: string
  notes: string
  sort_order: number
  created_at: string
  updated_at: string
}
export interface OneOnOneRow {
  id: string
  person_id: string
  day: LocalDay
  notes: string
  created_at: string
  updated_at: string
}
export type ProgressionKind = 'goal' | 'skill' | 'milestone'
export type ProgressionStatus = 'active' | 'done' | 'dropped'
export interface ProgressionRow {
  id: string
  kind: ProgressionKind
  title: string
  status: ProgressionStatus
  target_date: LocalDay | null
  done_date: LocalDay | null
  notes: string
  created_at: string
  updated_at: string
}
export type EvidenceKind = 'achievement' | 'feedback'
export interface EvidenceRow {
  id: string
  day: LocalDay
  kind: EvidenceKind
  title: string
  detail: string
  source: string
  progression_id: string | null
  project_id: string | null
  created_at: string
  updated_at: string
}
export type LearningKind = 'book' | 'course' | 'article' | 'video' | 'other'
export type LearningStatus = 'todo' | 'doing' | 'done' | 'dropped'
export interface LearningRow {
  id: string
  title: string
  kind: LearningKind
  status: LearningStatus
  url: string
  notes: string
  finished_at: string | null
  created_at: string
  updated_at: string
}

/** Next actions are items: module 'work', entity_type PROJECT_ENTITY, entity_id = project id. */
export const PROJECT_ENTITY = 'work.project'
const OPEN = new Set(['inbox', 'todo', 'waiting'])

export function workRepo(db: SqlDriver) {
  const items = itemsRepo(db)
  const people = peopleRepo(db)
  const stamp = <T extends object>(row: T): T & { created_at: string; updated_at: string } => {
    const t = nowIso()
    return { ...row, created_at: t, updated_at: t }
  }
  return {
    items,
    people,
    // projects
    projects: (area?: ProjectArea) =>
      area
        ? db.query<ProjectRow>(`SELECT * FROM projects WHERE area = ? ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'idea' THEN 2 ELSE 3 END, sort_order, name COLLATE NOCASE`, [area])
        : db.query<ProjectRow>(`SELECT * FROM projects ORDER BY area, CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'idea' THEN 2 ELSE 3 END, sort_order, name COLLATE NOCASE`),
    project: (id: string) => getRow<ProjectRow>(db, 'projects', id),
    async addProject(input: Partial<ProjectRow> & { name: string; area: ProjectArea }): Promise<ProjectRow> {
      const row: ProjectRow = stamp({ id: newId(), name: input.name.trim(), client: input.client ?? '', area: input.area, status: input.status ?? 'active', key_dates: input.key_dates ?? '[]', notes: input.notes ?? '', sort_order: input.sort_order ?? 0 })
      await insertRow(db, 'projects', row)
      return row
    },
    updateProject: (id: string, patch: Partial<Omit<ProjectRow, 'id' | 'created_at'>>) => updateRow(db, 'projects', id, { ...patch, updated_at: nowIso() }),
    removeProject: (id: string) => deleteRow(db, 'projects', id),
    keyDates: (p: ProjectRow): KeyDate[] => parseJson<KeyDate[]>(p.key_dates, []).filter((k) => k && typeof k.date === 'string'),
    setKeyDates: (id: string, dates: KeyDate[]) => updateRow(db, 'projects', id, { key_dates: JSON.stringify([...dates].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))), updated_at: nowIso() }),
    /** Open items per project, oldest first (the first one is the next action). */
    async openActions(): Promise<Map<string, ItemRow[]>> {
      const rows = await db.query<ItemRow>(`SELECT * FROM items WHERE entity_type = ? AND status IN ('inbox','todo','waiting') ORDER BY due_date IS NULL, due_date, created_at`, [PROJECT_ENTITY])
      const out = new Map<string, ItemRow[]>()
      for (const r of rows) {
        if (!r.entity_id) continue
        out.set(r.entity_id, [...(out.get(r.entity_id) ?? []), r])
      }
      return out
    },
    actions: (projectId: string) => items.listForEntity(PROJECT_ENTITY, projectId),
    addAction: (projectId: string, title: string) => items.create({ title, module: 'work', status: 'todo', entity_type: PROJECT_ENTITY, entity_id: projectId }),
    isOpen: (i: ItemRow) => OPEN.has(i.status),
    // people
    contacts: () => people.listByContext('work'),
    contact: (id: string) => people.get(id),
    addContact: (name: string, role = '') => people.create({ name, role, context: 'work' }),
    updateContact: (id: string, patch: Partial<Pick<PersonRow, 'name' | 'role' | 'cares_about' | 'notes' | 'birthday' | 'context'>>) => people.update(id, patch),
    removeContact: (id: string) => people.remove(id),
    oneOnOnes: (personId: string) => db.query<OneOnOneRow>('SELECT * FROM one_on_ones WHERE person_id = ? ORDER BY day DESC, created_at DESC', [personId]),
    async addOneOnOne(personId: string, day: LocalDay, notes: string): Promise<OneOnOneRow> {
      const row: OneOnOneRow = stamp({ id: newId(), person_id: personId, day, notes: notes.trim() })
      await insertRow(db, 'one_on_ones', row)
      await people.update(personId, { last_contacted_at: nowIso() })
      return row
    },
    updateOneOnOne: (id: string, patch: Partial<Pick<OneOnOneRow, 'day' | 'notes'>>) => updateRow(db, 'one_on_ones', id, { ...patch, updated_at: nowIso() }),
    removeOneOnOne: (id: string) => deleteRow(db, 'one_on_ones', id),
    // progression
    progression: (kind?: ProgressionKind) =>
      kind
        ? db.query<ProgressionRow>(`SELECT * FROM progression_items WHERE kind = ? ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'done' THEN 1 ELSE 2 END, target_date IS NULL, target_date, created_at`, [kind])
        : db.query<ProgressionRow>(`SELECT * FROM progression_items ORDER BY kind, CASE status WHEN 'active' THEN 0 WHEN 'done' THEN 1 ELSE 2 END, target_date IS NULL, target_date, created_at`),
    async addProgression(kind: ProgressionKind, title: string, target_date: LocalDay | null = null): Promise<ProgressionRow> {
      const row: ProgressionRow = stamp({ id: newId(), kind, title: title.trim(), status: 'active', target_date, done_date: null, notes: '' })
      await insertRow(db, 'progression_items', row)
      return row
    },
    updateProgression: (id: string, patch: Partial<Omit<ProgressionRow, 'id' | 'created_at'>>) => updateRow(db, 'progression_items', id, { ...patch, updated_at: nowIso() }),
    removeProgression: (id: string) => deleteRow(db, 'progression_items', id),
    // evidence
    evidence: (limit = 200) => db.query<EvidenceRow>('SELECT * FROM evidence ORDER BY day DESC, created_at DESC LIMIT ?', [limit]),
    evidenceFor: (progressionId: string) => db.query<EvidenceRow>('SELECT * FROM evidence WHERE progression_id = ? ORDER BY day DESC', [progressionId]),
    async addEvidence(input: Partial<EvidenceRow> & { day: LocalDay; title: string }): Promise<EvidenceRow> {
      const row: EvidenceRow = stamp({ id: newId(), day: input.day, kind: input.kind ?? 'achievement', title: input.title.trim(), detail: input.detail ?? '', source: input.source ?? '', progression_id: input.progression_id ?? null, project_id: input.project_id ?? null })
      await insertRow(db, 'evidence', row)
      return row
    },
    updateEvidence: (id: string, patch: Partial<Omit<EvidenceRow, 'id' | 'created_at'>>) => updateRow(db, 'evidence', id, { ...patch, updated_at: nowIso() }),
    removeEvidence: (id: string) => deleteRow(db, 'evidence', id),
    // learning
    learning: () => db.query<LearningRow>(`SELECT * FROM learning_items ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 WHEN 'done' THEN 2 ELSE 3 END, created_at DESC`),
    async addLearning(title: string, kind: LearningKind, url = ''): Promise<LearningRow> {
      const row: LearningRow = stamp({ id: newId(), title: title.trim(), kind, status: 'todo', url: url.trim(), notes: '', finished_at: null })
      await insertRow(db, 'learning_items', row)
      return row
    },
    updateLearning: (id: string, patch: Partial<Omit<LearningRow, 'id' | 'created_at'>>) => updateRow(db, 'learning_items', id, { ...patch, updated_at: nowIso(), ...(patch.status === 'done' ? { finished_at: nowIso() } : {}) }),
    removeLearning: (id: string) => deleteRow(db, 'learning_items', id),
  }
}

export type WorkRepo = ReturnType<typeof workRepo>
