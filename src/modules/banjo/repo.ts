import type { SqlDriver } from '@/core/db/driver'
import { newId, nowIso } from '@/core/ids'
import { deleteRow, getRow, insertRow, updateRow } from '@/core/repos/base'
import { filesRepo } from '@/core/repos/files'
import { logEntriesRepo, type LogEntry } from '@/core/repos/logEntries'

export type PieceStatus = 'learning' | 'polishing' | 'performance-ready'
export interface PieceRow {
  id: string
  title: string
  tuning: string
  status: PieceStatus
  notes: string
  created_at: string
  updated_at: string
}
export interface GoalRow {
  id: string
  title: string
  kind: 'piece' | 'technique'
  target_date: string | null
  status: 'active' | 'done'
  notes: string
  piece_id: string | null
  created_at: string
  updated_at: string
}

export const LOG = { practice: 'practice' } as const
export const PIECE_ENTITY = 'banjo.piece'
export const STATUSES: { key: PieceStatus; label: string }[] = [
  { key: 'learning', label: 'Learning' },
  { key: 'polishing', label: 'Polishing' },
  { key: 'performance-ready', label: 'Ready' },
]

export interface PracticeInput {
  minutes: number
  worked_on?: string
  notes?: string
  piece_id?: string | null
  /** Start instant; defaults to now minus minutes. */
  ts?: string
}

export function banjoRepo(db: SqlDriver) {
  const logs = logEntriesRepo(db)
  const files = filesRepo(db)
  return {
    logs,
    files,
    pieces: () => db.query<PieceRow>(`SELECT * FROM banjo_pieces ORDER BY CASE status WHEN 'learning' THEN 0 WHEN 'polishing' THEN 1 ELSE 2 END, title COLLATE NOCASE`),
    piece: (id: string) => getRow<PieceRow>(db, 'banjo_pieces', id),
    async addPiece(title: string, tuning = ''): Promise<PieceRow> {
      const t = nowIso()
      const row: PieceRow = { id: newId(), title: title.trim(), tuning, status: 'learning', notes: '', created_at: t, updated_at: t }
      await insertRow(db, 'banjo_pieces', row)
      return row
    },
    updatePiece: (id: string, patch: Partial<Omit<PieceRow, 'id' | 'created_at'>>) => updateRow(db, 'banjo_pieces', id, { ...patch, updated_at: nowIso() }),
    removePiece: (id: string) => deleteRow(db, 'banjo_pieces', id),

    goals: (status?: GoalRow['status']) =>
      status ? db.query<GoalRow>(`SELECT * FROM banjo_goals WHERE status = ? ORDER BY target_date IS NULL, target_date, created_at`, [status]) : db.query<GoalRow>(`SELECT * FROM banjo_goals ORDER BY status, target_date IS NULL, target_date`),
    async addGoal(input: { title: string; kind?: GoalRow['kind']; target_date?: string | null; piece_id?: string | null }): Promise<GoalRow> {
      const t = nowIso()
      const row: GoalRow = { id: newId(), title: input.title.trim(), kind: input.kind ?? 'piece', target_date: input.target_date ?? null, status: 'active', notes: '', piece_id: input.piece_id ?? null, created_at: t, updated_at: t }
      await insertRow(db, 'banjo_goals', row)
      return row
    },
    updateGoal: (id: string, patch: Partial<Omit<GoalRow, 'id' | 'created_at'>>) => updateRow(db, 'banjo_goals', id, { ...patch, updated_at: nowIso() }),
    removeGoal: (id: string) => deleteRow(db, 'banjo_goals', id),

    async logPractice(input: PracticeInput): Promise<LogEntry> {
      const minutes = Math.max(1, Math.round(input.minutes))
      const end = new Date()
      const start = input.ts ? new Date(input.ts) : new Date(end.getTime() - minutes * 60_000)
      return logs.add({
        type: LOG.practice,
        module: 'banjo',
        ts: start.toISOString(),
        ts_end: input.ts ? new Date(start.getTime() + minutes * 60_000).toISOString() : end.toISOString(),
        value: minutes,
        unit: 'min',
        payload: { worked_on: input.worked_on ?? '', notes: input.notes ?? '', ...(input.piece_id ? { piece_id: input.piece_id } : {}) },
        entity_type: input.piece_id ? PIECE_ENTITY : null,
        entity_id: input.piece_id ?? null,
      })
    },
    async sessions(limit = 100): Promise<LogEntry[]> {
      const rows = await db.query<{ id: string }>(`SELECT id FROM log_entries WHERE type = ? ORDER BY ts DESC LIMIT ?`, [LOG.practice, limit])
      const out: LogEntry[] = []
      for (const r of rows) {
        const e = await logs.get(r.id)
        if (e) out.push(e)
      }
      return out
    },
    practiceStamps: (fromTs: string) => logs.stampsOfType(LOG.practice, fromTs),
    minutesSince: async (fromTs: string) => (await db.query<{ m: number | null }>(`SELECT SUM(value) AS m FROM log_entries WHERE type = ? AND ts >= ?`, [LOG.practice, fromTs]))[0]?.m ?? 0,
    pieceFiles: (pieceId: string) => files.forEntity(PIECE_ENTITY, pieceId),
  }
}

export type BanjoRepo = ReturnType<typeof banjoRepo>
