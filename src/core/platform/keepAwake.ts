import { KeepAwake } from '@capacitor-community/keep-awake'
import { isNative } from './platform'

let webLock: { release: () => Promise<void> } | null = null

/** Keep the screen on while a viewer is open. Falls back to the Screen Wake Lock API in a browser. */
export async function keepScreenAwake(on: boolean): Promise<void> {
  try {
    if (isNative()) {
      if (on) await KeepAwake.keepAwake()
      else await KeepAwake.allowSleep()
      return
    }
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    if (on && nav.wakeLock && !webLock) webLock = await nav.wakeLock.request('screen')
    if (!on && webLock) {
      await webLock.release()
      webLock = null
    }
  } catch {
    /* best effort */
  }
}
