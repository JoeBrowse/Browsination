import { App } from '@capacitor/app'
import { isNative } from './platform'

/** Fires when the app comes to the foreground (native) or the tab becomes visible (web). */
export function onForeground(cb: () => void): () => void {
  if (isNative()) {
    const handle = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) cb()
    })
    return () => void handle.then((h) => h.remove())
  }
  const listener = () => {
    if (document.visibilityState === 'visible') cb()
  }
  document.addEventListener('visibilitychange', listener)
  return () => document.removeEventListener('visibilitychange', listener)
}

/** Fires when the app goes to the background (native) or the tab is hidden (web). */
export function onBackground(cb: () => void): () => void {
  if (isNative()) {
    const handle = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) cb()
    })
    return () => void handle.then((h) => h.remove())
  }
  const listener = () => {
    if (document.visibilityState === 'hidden') cb()
  }
  document.addEventListener('visibilitychange', listener)
  return () => document.removeEventListener('visibilitychange', listener)
}
