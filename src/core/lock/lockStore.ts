import { create } from 'zustand'
import type { ModuleDef } from '../modules/types'

export type LockMode = 'off' | 'money' | 'app'

export interface LockConfig {
  mode: LockMode
  biometric: boolean
  graceSeconds: number
  hasPin: boolean
}

interface LockState extends LockConfig {
  locked: boolean
  hiddenAt: number | null
  configure: (c: Partial<LockConfig>) => void
  lock: () => void
  unlock: () => void
  hidden: (now?: number) => void
  shown: (now?: number) => void
}

/** Whether the lock should re-engage after time in the background. */
export function shouldRelock(hiddenAt: number | null, now: number, graceSeconds: number): boolean {
  if (hiddenAt === null) return false
  return now - hiddenAt >= graceSeconds * 1000
}

/** A lock only bites when a PIN exists; a mode without one is treated as off. */
export function effectiveMode(c: Pick<LockConfig, 'mode' | 'hasPin'>): LockMode {
  return c.hasPin ? c.mode : 'off'
}

export function isModuleLocked(s: Pick<LockState, 'mode' | 'hasPin' | 'locked'>, m: Pick<ModuleDef, 'requiresLock'>): boolean {
  const mode = effectiveMode(s)
  if (mode === 'off' || !s.locked) return false
  return mode === 'app' || !!m.requiresLock
}

export const useLock = create<LockState>((set, get) => ({
  mode: 'off',
  biometric: false,
  graceSeconds: 60,
  hasPin: false,
  locked: false,
  hiddenAt: null,
  configure: (c) => set(c),
  lock: () => set({ locked: effectiveMode(get()) !== 'off' }),
  unlock: () => set({ locked: false, hiddenAt: null }),
  hidden: (now = Date.now()) => set({ hiddenAt: now }),
  shown: (now = Date.now()) => {
    const s = get()
    if (effectiveMode(s) !== 'off' && shouldRelock(s.hiddenAt, now, s.graceSeconds)) set({ locked: true, hiddenAt: null })
    else set({ hiddenAt: null })
  },
}))
