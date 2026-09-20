import type { SqlDriver } from '../db/driver'
import { newId, nowIso } from '../ids'
import { deleteRow, getRow, insertRow, updateRow } from './base'

export interface PersonRow {
  id: string
  name: string
  relationship: string
  /** 'YYYY-MM-DD', or '--MM-DD' when the year is unknown. */
  birthday: string | null
  notes: string
  last_contacted_at: string | null
  /** Nudge when not contacted for this many days (null = no nudge). */
  keep_in_touch_days: number | null
  created_at: string
  updated_at: string
}

export interface GiftIdeaRow {
  id: string
  person_id: string
  title: string
  notes: string
  status: 'idea' | 'done'
  created_at: string
  updated_at: string
}

export type NewPerson = Partial<Omit<PersonRow, 'id' | 'created_at' | 'updated_at'>> & { name: string }

export function peopleRepo(db: SqlDriver) {
  return {
    async create(input: NewPerson): Promise<PersonRow> {
      const t = nowIso()
      const row: PersonRow = {
        id: newId(),
        name: input.name.trim(),
        relationship: input.relationship ?? '',
        birthday: input.birthday ?? null,
        notes: input.notes ?? '',
        last_contacted_at: input.last_contacted_at ?? null,
        keep_in_touch_days: input.keep_in_touch_days ?? null,
        created_at: t,
        updated_at: t,
      }
      await insertRow(db, 'people', row)
      return row
    },
    get: (id: string) => getRow<PersonRow>(db, 'people', id),
    update: (id: string, patch: Partial<Omit<PersonRow, 'id' | 'created_at'>>) => updateRow(db, 'people', id, { ...patch, updated_at: nowIso() }),
    remove: (id: string) => deleteRow(db, 'people', id),
    list: () => db.query<PersonRow>('SELECT * FROM people ORDER BY name COLLATE NOCASE'),

    async addGiftIdea(person_id: string, title: string, notes = ''): Promise<GiftIdeaRow> {
      const t = nowIso()
      const row: GiftIdeaRow = { id: newId(), person_id, title: title.trim(), notes, status: 'idea', created_at: t, updated_at: t }
      await insertRow(db, 'gift_ideas', row)
      return row
    },
    giftIdeas: (person_id: string) => db.query<GiftIdeaRow>('SELECT * FROM gift_ideas WHERE person_id = ? ORDER BY status, created_at', [person_id]),
    updateGiftIdea: (id: string, patch: Partial<Omit<GiftIdeaRow, 'id' | 'person_id' | 'created_at'>>) =>
      updateRow(db, 'gift_ideas', id, { ...patch, updated_at: nowIso() }),
    removeGiftIdea: (id: string) => deleteRow(db, 'gift_ideas', id),
  }
}

export type PeopleRepo = ReturnType<typeof peopleRepo>
