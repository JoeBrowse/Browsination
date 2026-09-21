import { create } from 'zustand'

const KEY = 'focus.session'

export interface FocusSession {
  itemId: string | null
  title: string
  module: string | null
  startedAt: number
  minutes: number
}

function load(): FocusSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as FocusSession
    return typeof s.startedAt === 'number' && typeof s.minutes === 'number' ? s : null
  } catch {
    return null
  }
}
function persist(s: FocusSession | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

interface FocusState {
  session: FocusSession | null
  start: (s: Omit<FocusSession, 'startedAt'>) => FocusSession
  /** Ends the session and returns it with the whole minutes actually spent (at least one). */
  stop: () => (FocusSession & { spentMinutes: number; endedAt: number }) | null
}

/** One focus session at a time; survives an app restart (kept in localStorage). */
export const useFocus = create<FocusState>((set, get) => ({
  session: load(),
  start: (s) => {
    const session = { ...s, startedAt: Date.now() }
    persist(session)
    set({ session })
    return session
  },
  stop: () => {
    const s = get().session
    if (!s) return null
    persist(null)
    set({ session: null })
    const endedAt = Date.now()
    return { ...s, endedAt, spentMinutes: Math.max(1, Math.round((endedAt - s.startedAt) / 60_000)) }
  },
}))

export const endsAt = (s: FocusSession): number => s.startedAt + s.minutes * 60_000

export function remainingLabel(s: FocusSession, now = Date.now()): string {
  const left = Math.max(0, Math.round((endsAt(s) - now) / 1000))
  const m = Math.floor(left / 60)
  const sec = left % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export const FOCUS_LOG_TYPE = 'focus'
export const FOCUS_NOTIFICATION_KEY = 'focus:end'
