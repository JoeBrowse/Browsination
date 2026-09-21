import type { SqlDriver } from '@/core/db/driver'
import { newId, nowIso } from '@/core/ids'
import { deleteRow, getRow, insertRow, updateRow } from '@/core/repos/base'
import { filesRepo } from '@/core/repos/files'
import { logEntriesRepo, type LogEntry } from '@/core/repos/logEntries'
import { dayRange } from '@/core/tasks/queries'
import type { LocalDay } from '@/core/time/localDay'
import { newChunkState, scheduleReview, type Quality } from './learning/logic'

export type PieceStatus = 'learning' | 'polishing' | 'performance-ready'
export interface PieceRow {
  id: string
  title: string
  tuning: string
  status: PieceStatus
  notes: string
  /** Total bars in the score (null until set) and how many from the start are learned. */
  bars: number | null
  learned_bars: number
  created_at: string
  updated_at: string
}
/** A block of bars learned in one go, with its own spaced-repetition state. */
export interface ChunkRow {
  id: string
  piece_id: string
  from_bar: number
  to_bar: number
  due: LocalDay
  interval_days: number
  ease: number
  reps: number
  lapses: number
  last_reviewed: LocalDay | null
  last_quality: number | null
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

export const LOG = {
  practice: 'practice', // value minutes, payload { worked_on, notes, piece_id? }
  learn: 'learn', // value bars learned, payload { piece_id, from_bar, to_bar }, entity banjo.piece
  review: 'review', // value quality 1-3, payload { piece_id, from_bar, to_bar, interval_before, interval_after }, entity banjo.chunk
} as const
export const PIECE_ENTITY = 'banjo.piece'
export const CHUNK_ENTITY = 'banjo.chunk'
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
      const row: PieceRow = { id: newId(), title: title.trim(), tuning, status: 'learning', notes: '', bars: null, learned_bars: 0, created_at: t, updated_at: t }
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

    // learning plan
    chunks: (pieceId?: string) => (pieceId ? db.query<ChunkRow>('SELECT * FROM banjo_chunks WHERE piece_id = ? ORDER BY from_bar', [pieceId]) : db.query<ChunkRow>('SELECT * FROM banjo_chunks ORDER BY due, from_bar')),
    chunk: (id: string) => getRow<ChunkRow>(db, 'banjo_chunks', id),
    /** The next `n` bars of a piece become a chunk due tomorrow; the piece's frontier moves on. */
    async learnBars(pieceId: string, n: number, today: LocalDay): Promise<ChunkRow | null> {
      const piece = await getRow<PieceRow>(db, 'banjo_pieces', pieceId)
      if (!piece || n < 1) return null
      const from = piece.learned_bars + 1
      const to = piece.bars ? Math.min(piece.bars, piece.learned_bars + Math.round(n)) : piece.learned_bars + Math.round(n)
      if (to < from) return null
      const t = nowIso()
      const row: ChunkRow = { id: newId(), piece_id: pieceId, from_bar: from, to_bar: to, ...newChunkState(today), last_quality: null, created_at: t, updated_at: t }
      await insertRow(db, 'banjo_chunks', row)
      await updateRow(db, 'banjo_pieces', pieceId, { learned_bars: to, updated_at: t })
      await logs.add({ type: LOG.learn, module: 'banjo', value: to - from + 1, unit: 'bars', entity_type: PIECE_ENTITY, entity_id: pieceId, payload: { piece_id: pieceId, from_bar: from, to_bar: to } })
      return row
    },
    /** Rate a review; the chunk is rescheduled and the rating logged. */
    async review(chunkId: string, quality: Quality, today: LocalDay): Promise<ChunkRow | null> {
      const c = await getRow<ChunkRow>(db, 'banjo_chunks', chunkId)
      if (!c) return null
      const next = scheduleReview(c, quality, today)
      await updateRow(db, 'banjo_chunks', chunkId, { ...next, last_quality: quality, updated_at: nowIso() })
      await logs.add({ type: LOG.review, module: 'banjo', value: quality, unit: 'quality', entity_type: CHUNK_ENTITY, entity_id: chunkId, payload: { piece_id: c.piece_id, from_bar: c.from_bar, to_bar: c.to_bar, interval_before: c.interval_days, interval_after: next.interval_days } })
      return { ...c, ...next, last_quality: quality }
    },
    /** Drop a chunk (logged by mistake); the frontier falls back to the last remaining chunk. */
    async removeChunk(id: string): Promise<void> {
      const c = await getRow<ChunkRow>(db, 'banjo_chunks', id)
      if (!c) return
      await deleteRow(db, 'banjo_chunks', id)
      const rest = await db.query<ChunkRow>('SELECT * FROM banjo_chunks WHERE piece_id = ? ORDER BY to_bar DESC LIMIT 1', [c.piece_id])
      await updateRow(db, 'banjo_pieces', c.piece_id, { learned_bars: rest[0]?.to_bar ?? 0, updated_at: nowIso() })
    },
    async resetLearning(pieceId: string): Promise<void> {
      await db.run('DELETE FROM banjo_chunks WHERE piece_id = ?', [pieceId])
      await updateRow(db, 'banjo_pieces', pieceId, { learned_bars: 0, updated_at: nowIso() })
    },
    reviewsOn: async (day: LocalDay) => {
      const r = dayRange(day)
      return (await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM log_entries WHERE type = ? AND ts >= ? AND ts < ?', [LOG.review, r.from, r.to]))[0]?.n ?? 0
    },
  }
}

export type BanjoRepo = ReturnType<typeof banjoRepo>
