import { LocalNotifications } from '@capacitor/local-notifications'
import type { NotificationPort, PendingNotification, PlannedNotification } from '../notifications/types'
import { isNative } from './platform'

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported'

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

const CHANNELS = [
  { id: 'timed', name: 'Reminders', description: 'Timed reminders', importance: 4 as const },
  { id: 'digest', name: 'Digests', description: 'Morning and evening summaries', importance: 3 as const },
]

/** The only code that schedules or cancels OS notifications. */
export function createNotificationPort(): NotificationPort {
  if (!isNative()) return memoryPort()
  let channelsReady: Promise<void> | null = null
  const ensureChannels = () => {
    if (!channelsReady) channelsReady = Promise.all(CHANNELS.map((c) => LocalNotifications.createChannel(c))).then(() => undefined)
    return channelsReady
  }
  return {
    async getPending(): Promise<PendingNotification[]> {
      const r = await LocalNotifications.getPending()
      return r.notifications.map((n) => ({
        id: n.id,
        at: n.schedule?.at ? new Date(n.schedule.at).toISOString() : null,
        title: n.title ?? '',
        body: n.body ?? '',
      }))
    },
    async schedule(list: PlannedNotification[]) {
      await ensureChannels()
      await LocalNotifications.schedule({
        notifications: list.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          channelId: n.channel,
          schedule: { at: new Date(n.at), allowWhileIdle: n.channel === 'timed' },
          extra: { route: n.route, key: n.key },
        })),
      })
    },
    async cancel(ids: number[]) {
      if (ids.length) await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
    },
  }
}

/** Fires with the route stored on a notification when the user taps it. */
export function onNotificationTap(cb: (route: string) => void): () => void {
  if (!isNative()) return () => undefined
  const handle = LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const route = (a.notification.extra as { route?: string } | undefined)?.route
    if (route) cb(route)
  })
  return () => void handle.then((h) => h.remove())
}

function memoryPort(): NotificationPort {
  const pending = new Map<number, PendingNotification>()
  return {
    async getPending() {
      return [...pending.values()]
    },
    async schedule(list) {
      for (const n of list) pending.set(n.id, { id: n.id, at: n.at, title: n.title, body: n.body })
    },
    async cancel(ids) {
      for (const id of ids) pending.delete(id)
    },
  }
}
