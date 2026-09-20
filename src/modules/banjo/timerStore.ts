import { create } from 'zustand'

const KEY = 'banjo.practice.startedAt'

function load(): number | null {
  try {
    const v = localStorage.getItem(KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

interface TimerState {
  startedAt: number | null
  start: () => void
  /** Stops and returns whole minutes elapsed (at least one). */
  stop: () => number
}

/** Practice timer that survives an app restart (start instant kept in localStorage). */
export const usePracticeTimer = create<TimerState>((set, get) => ({
  startedAt: load(),
  start: () => {
    const now = Date.now()
    try {
      localStorage.setItem(KEY, String(now))
    } catch {
      /* ignore */
    }
    set({ startedAt: now })
  },
  stop: () => {
    const started = get().startedAt ?? Date.now()
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    set({ startedAt: null })
    return Math.max(1, Math.round((Date.now() - started) / 60_000))
  },
}))

export function elapsedLabel(startedAt: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - startedAt) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
