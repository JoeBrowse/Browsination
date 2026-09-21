import { dbEvents } from '../db/events'
import type { Settings } from '../settings/schema'
import { useLock } from './lockStore'

interface Deps {
  settings: { all(): Promise<Settings> }
  onForeground: (cb: () => void) => () => void
  onBackground: (cb: () => void) => () => void
}

/** Loads lock settings into the store, locks on boot, and re-locks after time in the background. */
export function installLock(deps: Deps): () => void {
  const store = useLock.getState()
  const load = async (first: boolean) => {
    const v = await deps.settings.all()
    store.configure({ mode: v['lock.mode'], biometric: v['lock.biometric'], graceSeconds: v['lock.graceSeconds'], hasPin: v['lock.pin'] !== null })
    if (first) useLock.getState().lock()
  }
  void load(true)
  const offSettings = dbEvents.subscribe((changed) => {
    if (dbEvents.affects(changed, ['settings'])) void load(false)
  })
  const offBg = deps.onBackground(() => useLock.getState().hidden())
  const offFg = deps.onForeground(() => useLock.getState().shown())
  return () => {
    offSettings()
    offBg()
    offFg()
  }
}
