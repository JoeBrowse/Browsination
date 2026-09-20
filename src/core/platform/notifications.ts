import { LocalNotifications } from '@capacitor/local-notifications'
import { isNative } from './platform'

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported'

/** Permission plumbing only; scheduling lives in src/core/notifications (Stage 1). */
export async function checkNotificationPermission(): Promise<PermissionState> {
  if (!isNative()) return 'unsupported'
  const r = await LocalNotifications.checkPermissions()
  return normalise(r.display)
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!isNative()) return 'unsupported'
  const r = await LocalNotifications.requestPermissions()
  return normalise(r.display)
}

export async function checkExactAlarmPermission(): Promise<PermissionState> {
  if (!isNative()) return 'unsupported'
  try {
    const r = await LocalNotifications.checkExactNotificationSetting()
    return normalise(r.exact_alarm)
  } catch {
    return 'unsupported'
  }
}

function normalise(s: string): PermissionState {
  if (s === 'granted') return 'granted'
  if (s === 'denied') return 'denied'
  return 'prompt'
}
