import type { SqlDriver } from '@/core/db/driver'
import { newId, nowIso } from '@/core/ids'
import { leagueRepo } from '@/core/league/repo'
import { deleteRow, getRow, insertRow, updateRow } from '@/core/repos/base'
import { peopleRepo } from '@/core/repos/people'
import type { LocalDay } from '@/core/time/localDay'
import type { Occurrence } from './ics'

export interface CalendarRow {
  id: string
  name: string
  url: string
  enabled: number
  last_synced_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}
export interface EventRow {
  id: string
  calendar_id: string
  uid: string
  summary: string
  location: string
  description: string
  start_ts: string
  end_ts: string
  all_day: number
  created_at: string
  updated_at: string
}
export interface StudentRow {
  id: string
  person_id: string
  level: string
  goals: string
  notes: string
  active: number
  created_at: string
  updated_at: string
}
export interface StudentWithName extends StudentRow {
  name: string
}
export interface TemplateRow {
  id: string
  title: string
  body: string
  created_at: string
  updated_at: string
}
export interface LessonRow {
  id: string
  student_id: string
  event_id: string | null
  date: string
  plan: string
  notes_after: string
  created_at: string
  updated_at: string
}
export interface RepertoireRow {
  id: string
  colour: 'white' | 'black'
  parent_id: string | null
  name: string
  pgn: string
  notes: string
  confidence: number
  last_reviewed: string | null
  sort_order: number
  created_at: string
  updated_at: string
}
export interface TournamentRow {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  location: string
  entry_deadline: string | null
  entry_fee_pence: number | null
  entered: 'no' | 'yes' | 'skipped'
  url: string | null
  notes: string
  created_at: string
  updated_at: string
}

const stamped = <T extends object>(row: T) => ({ ...row, created_at: nowIso(), updated_at: nowIso() })

export function chessRepo(db: SqlDriver) {
  const people = peopleRepo(db)
  return {
    people,
    league: leagueRepo(db, 'chess'),

    // calendars
    calendars: () => db.query<CalendarRow>('SELECT * FROM calendars ORDER BY created_at'),
    async addCalendar(name: string, url: string): Promise<CalendarRow> {
      const row: CalendarRow = stamped({ id: newId(), name: name.trim() || 'Calendar', url: url.trim(), enabled: 1, last_synced_at: null, last_error: null })
      await insertRow(db, 'calendars', row)
      return row
    },
    updateCalendar: (id: string, patch: Partial<Omit<CalendarRow, 'id' | 'created_at'>>) => updateRow(db, 'calendars', id, { ...patch, updated_at: nowIso() }),
    removeCalendar: (id: string) => deleteRow(db, 'calendars', id),
    /** Replace the cached window for one calendar in a single transaction. */
    async replaceEvents(calendarId: string, occurrences: Occurrence[], fromTs: string, toTs: string): Promise<void> {
      const t = nowIso()
      await db.transaction(async (tx) => {
        await tx.run('DELETE FROM calendar_events WHERE calendar_id = ? AND start_ts >= ? AND start_ts < ?', [calendarId, fromTs, toTs])
        for (const o of occurrences) {
          await tx.run(
            'INSERT OR REPLACE INTO calendar_events (id, calendar_id, uid, summary, location, description, start_ts, end_ts, all_day, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            [`${calendarId}:${o.id}`, calendarId, o.uid, o.summary, o.location, o.description, o.start_ts, o.end_ts, o.all_day ? 1 : 0, t, t],
          )
        }
      })
    },
    eventsBetween: (fromTs: string, toTs: string) =>
      db.query<EventRow>(
        'SELECT e.* FROM calendar_events e JOIN calendars c ON c.id = e.calendar_id WHERE c.enabled = 1 AND e.start_ts >= ? AND e.start_ts < ? ORDER BY e.start_ts',
        [fromTs, toTs],
      ),

    // students and lessons
    students: (activeOnly = true) =>
      db.query<StudentWithName>(
        `SELECT s.*, p.name AS name FROM students s JOIN people p ON p.id = s.person_id ${activeOnly ? 'WHERE s.active = 1' : ''} ORDER BY p.name COLLATE NOCASE`,
      ),
    student: async (id: string) => (await db.query<StudentWithName>('SELECT s.*, p.name AS name FROM students s JOIN people p ON p.id = s.person_id WHERE s.id = ?', [id]))[0] ?? null,
    async addStudent(name: string): Promise<StudentRow> {
      const person = await people.create({ name, relationship: 'student' })
      const row: StudentRow = stamped({ id: newId(), person_id: person.id, level: '', goals: '', notes: '', active: 1 })
      await insertRow(db, 'students', row)
      return row
    },
    updateStudent: (id: string, patch: Partial<Omit<StudentRow, 'id' | 'person_id' | 'created_at'>>) => updateRow(db, 'students', id, { ...patch, updated_at: nowIso() }),
    lessons: (studentId: string) => db.query<LessonRow>('SELECT * FROM lessons WHERE student_id = ? ORDER BY date DESC, created_at DESC', [studentId]),
    lessonsOn: (day: LocalDay) => db.query<LessonRow>('SELECT * FROM lessons WHERE date = ?', [day]),
    async addLesson(input: { student_id: string; date: LocalDay; event_id?: string | null; plan?: string }): Promise<LessonRow> {
      const row: LessonRow = stamped({ id: newId(), student_id: input.student_id, event_id: input.event_id ?? null, date: input.date, plan: input.plan ?? '', notes_after: '' })
      await insertRow(db, 'lessons', row)
      return row
    },
    updateLesson: (id: string, patch: Partial<Omit<LessonRow, 'id' | 'created_at'>>) => updateRow(db, 'lessons', id, { ...patch, updated_at: nowIso() }),
    removeLesson: (id: string) => deleteRow(db, 'lessons', id),
    templates: () => db.query<TemplateRow>('SELECT * FROM lesson_templates ORDER BY title COLLATE NOCASE'),
    async addTemplate(title: string, body: string): Promise<TemplateRow> {
      const row: TemplateRow = stamped({ id: newId(), title: title.trim(), body })
      await insertRow(db, 'lesson_templates', row)
      return row
    },
    updateTemplate: (id: string, patch: Partial<Omit<TemplateRow, 'id' | 'created_at'>>) => updateRow(db, 'lesson_templates', id, { ...patch, updated_at: nowIso() }),
    removeTemplate: (id: string) => deleteRow(db, 'lesson_templates', id),

    // repertoire
    repertoire: (colour?: 'white' | 'black') =>
      colour ? db.query<RepertoireRow>('SELECT * FROM repertoire WHERE colour = ?', [colour]) : db.query<RepertoireRow>('SELECT * FROM repertoire'),
    line: (id: string) => getRow<RepertoireRow>(db, 'repertoire', id),
    async addLine(input: { colour: 'white' | 'black'; parent_id: string | null; name: string; pgn?: string }): Promise<RepertoireRow> {
      const siblings = (await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM repertoire WHERE colour = ? AND parent_id IS ?', [input.colour, input.parent_id]))[0]?.n ?? 0
      const row: RepertoireRow = stamped({ id: newId(), colour: input.colour, parent_id: input.parent_id, name: input.name.trim(), pgn: input.pgn ?? '', notes: '', confidence: 1, last_reviewed: null, sort_order: siblings })
      await insertRow(db, 'repertoire', row)
      return row
    },
    updateLine: (id: string, patch: Partial<Omit<RepertoireRow, 'id' | 'created_at'>>) => updateRow(db, 'repertoire', id, { ...patch, updated_at: nowIso() }),
    removeLine: (id: string) => deleteRow(db, 'repertoire', id),
    markReviewed: (id: string, today: LocalDay, confidence?: number) => updateRow(db, 'repertoire', id, { last_reviewed: today, ...(confidence ? { confidence } : {}), updated_at: nowIso() }),

    // tournaments
    tournaments: () => db.query<TournamentRow>(`SELECT * FROM tournaments ORDER BY CASE entered WHEN 'no' THEN 0 WHEN 'yes' THEN 1 ELSE 2 END, start_date`),
    async addTournament(input: Partial<TournamentRow> & { name: string }): Promise<TournamentRow> {
      const row: TournamentRow = stamped({ id: newId(), name: input.name.trim(), start_date: input.start_date ?? null, end_date: input.end_date ?? null, location: input.location ?? '', entry_deadline: input.entry_deadline ?? null, entry_fee_pence: input.entry_fee_pence ?? null, entered: input.entered ?? 'no', url: input.url ?? null, notes: input.notes ?? '' })
      await insertRow(db, 'tournaments', row)
      return row
    },
    updateTournament: (id: string, patch: Partial<Omit<TournamentRow, 'id' | 'created_at'>>) => updateRow(db, 'tournaments', id, { ...patch, updated_at: nowIso() }),
    removeTournament: (id: string) => deleteRow(db, 'tournaments', id),
  }
}

export type ChessRepo = ReturnType<typeof chessRepo>
