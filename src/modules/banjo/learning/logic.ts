import { addDays, daysBetween, type LocalDay } from '@/core/time/localDay'

/**
 * Spaced, interleaved learning of pieces in bar-sized chunks.
 *
 * What the research supports (see docs/BANJO_PRACTICE.md): small chunks; a short blocked burst to get
 * a new chunk playable, then interleaving across pieces within a session; reviews spaced over days
 * with intervals that grow while a chunk holds and shrink when it slips; rating the *next-day* attempt,
 * not how the session felt. The maths below is a deliberately small SM-2-style scheduler.
 */
export interface ChunkLike {
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
}
export interface PieceLike {
  id: string
  title: string
  status: string
  bars: number | null
  learned_bars: number
}

/** 1 shaky, 2 okay, 3 solid. Three buttons, no scale to think about. */
export type Quality = 1 | 2 | 3
export const QUALITY_LABEL: Record<Quality, string> = { 1: 'Shaky', 2: 'OK', 3: 'Solid' }

export const MAX_INTERVAL = 60
export const SOLID_INTERVAL = 21
export const MIN_EASE = 1.3
export const MAX_EASE = 3

export type Stage = 'new' | 'learning' | 'review' | 'solid'
export function chunkStage(c: Pick<ChunkLike, 'reps' | 'interval_days'>): Stage {
  if (c.reps === 0) return 'new'
  if (c.interval_days >= SOLID_INTERVAL) return 'solid'
  if (c.interval_days >= 7) return 'review'
  return 'learning'
}

export const barCount = (c: Pick<ChunkLike, 'from_bar' | 'to_bar'>): number => Math.max(0, c.to_bar - c.from_bar + 1)

/** A freshly learned chunk comes back tomorrow: one night's sleep before the first test. */
export function newChunkState(today: LocalDay): Pick<ChunkLike, 'due' | 'interval_days' | 'ease' | 'reps' | 'lapses' | 'last_reviewed'> {
  return { due: addDays(today, 1), interval_days: 1, ease: 2.5, reps: 0, lapses: 0, last_reviewed: null }
}

/** Next state after a review. Solid grows the gap, OK grows it gently, Shaky brings it back to tomorrow. */
export function scheduleReview(c: ChunkLike, quality: Quality, today: LocalDay): Pick<ChunkLike, 'due' | 'interval_days' | 'ease' | 'reps' | 'lapses' | 'last_reviewed'> {
  let interval: number
  let ease = c.ease
  let reps = c.reps
  let lapses = c.lapses
  if (quality === 1) {
    interval = 1
    reps = 0
    lapses += 1
    ease = Math.max(MIN_EASE, ease - 0.2)
  } else if (quality === 2) {
    reps += 1
    interval = reps === 1 ? 2 : Math.max(c.interval_days + 1, Math.round(c.interval_days * 1.4))
  } else {
    reps += 1
    interval = reps === 1 ? 3 : reps === 2 ? 7 : Math.max(c.interval_days + 1, Math.round(c.interval_days * ease))
    ease = Math.min(MAX_EASE, ease + 0.05)
  }
  interval = Math.min(MAX_INTERVAL, interval)
  return { due: addDays(today, interval), interval_days: interval, ease: Math.round(ease * 100) / 100, reps, lapses, last_reviewed: today }
}

export interface Progress {
  bars: number | null
  learned: number
  solid: number
  /** 0..1, null without a bar count. */
  learnedFraction: number | null
  solidFraction: number | null
}

export function pieceProgress(piece: PieceLike, chunks: ChunkLike[]): Progress {
  const mine = chunks.filter((c) => c.piece_id === piece.id)
  const solid = mine.filter((c) => chunkStage(c) === 'solid').reduce((n, c) => n + barCount(c), 0)
  const learned = piece.bars ? Math.min(piece.bars, piece.learned_bars) : piece.learned_bars
  return { bars: piece.bars, learned, solid, learnedFraction: piece.bars ? Math.min(1, learned / piece.bars) : null, solidFraction: piece.bars ? Math.min(1, solid / piece.bars) : null }
}

export const percent = (f: number | null): string => (f === null ? '' : `${Math.round(f * 100)}%`)

/** Typical size of this piece's chunks (median), or four bars to start with. */
export function suggestedBars(chunks: ChunkLike[], pieceId: string, fallback = 4): number {
  const sizes = chunks.filter((c) => c.piece_id === pieceId).map(barCount).sort((a, b) => a - b)
  if (sizes.length === 0) return fallback
  return sizes[Math.floor(sizes.length / 2)]!
}

/** Alternate pieces where possible so two blocks on the same piece never sit together (contextual interference). */
export function interleave<T extends { piece_id: string }>(items: T[]): T[] {
  const out: T[] = []
  const pool = [...items]
  while (pool.length) {
    const last = out[out.length - 1]?.piece_id
    const i = pool.findIndex((c) => c.piece_id !== last)
    out.push(pool.splice(i === -1 ? 0 : i, 1)[0]!)
  }
  return out
}

export interface LearnSuggestion {
  piece: PieceLike
  fromBar: number
  suggestedBars: number
  /** Why this piece, for the row's sub line. */
  reason: 'first' | 'least recent' | 'only one'
}

export interface SessionPlan {
  /** Due chunks, most overdue first, interleaved across pieces, capped. */
  reviews: ChunkLike[]
  /** Everything due beyond the cap. */
  moreDue: number
  learn: LearnSuggestion | null
}

/** Days since the piece was last touched (a review or a chunk learned), for taking turns between pieces. */
function lastTouched(piece: PieceLike, chunks: ChunkLike[]): LocalDay | null {
  let last: LocalDay | null = null
  for (const c of chunks) {
    if (c.piece_id !== piece.id) continue
    const day = c.last_reviewed ?? addDays(c.due, -Math.round(c.interval_days))
    if (!last || day > last) last = day
  }
  return last
}

/**
 * Today's plan. Reviews: whatever is due, oldest debt first, alternating pieces. Learn: the piece
 * with bars still to learn that has waited longest, skipping any piece with three or more chunks
 * still in their first days (consolidate before adding), unless nothing else qualifies.
 */
export function planSession(pieces: PieceLike[], chunks: ChunkLike[], today: LocalDay, maxReviews = 5): SessionPlan {
  const due = chunks.filter((c) => c.due <= today).sort((a, b) => daysBetween(b.due, today) - daysBetween(a.due, today) || (a.piece_id < b.piece_id ? -1 : 1))
  const reviews = interleave(due.slice(0, maxReviews))
  const candidates = pieces.filter((p) => p.status !== 'performance-ready' && (p.bars === null || p.learned_bars < p.bars))
  const fresh = (p: PieceLike) => chunks.filter((c) => c.piece_id === p.id && c.interval_days < 3 && chunkStage(c) !== 'solid').length
  const ranked = [...candidates].sort((a, b) => {
    const la = lastTouched(a, chunks)
    const lb = lastTouched(b, chunks)
    if (la !== lb) return la === null ? -1 : lb === null ? 1 : la < lb ? -1 : 1
    const fa = a.bars ? a.learned_bars / a.bars : 0
    const fb = b.bars ? b.learned_bars / b.bars : 0
    return fa - fb || a.title.localeCompare(b.title)
  })
  const pick = ranked.find((p) => fresh(p) < 3) ?? ranked[0] ?? null
  const learn: LearnSuggestion | null = pick ? { piece: pick, fromBar: pick.learned_bars + 1, suggestedBars: suggestedBars(chunks, pick.id), reason: candidates.length === 1 ? 'only one' : lastTouched(pick, chunks) === null ? 'first' : 'least recent' } : null
  return { reviews, moreDue: Math.max(0, due.length - maxReviews), learn }
}

export const dueLabel = (due: LocalDay, today: LocalDay): string => {
  const d = daysBetween(due, today)
  return d <= 0 ? 'due today' : d === 1 ? '1 day late' : `${d} days late`
}
