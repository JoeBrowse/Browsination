/** What the planner wants scheduled. `id` is a stable 31-bit int derived from `key`. */
export interface PlannedNotification {
  id: number
  key: string
  /** ISO instant. */
  at: string
  title: string
  body: string
  channel: 'timed' | 'digest'
  /** Route opened when tapped. */
  route: string
}

/** What the OS currently holds for us. */
export interface PendingNotification {
  id: number
  at: string | null
  title: string
  body: string
}

/** The only thing that talks to the notifications plugin (implemented in src/core/platform). */
export interface NotificationPort {
  getPending(): Promise<PendingNotification[]>
  schedule(list: PlannedNotification[]): Promise<void>
  cancel(ids: number[]): Promise<void>
}

/** FNV-1a folded to a positive 31-bit int (Android notification ids are 32-bit). */
export function notificationId(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h & 0x7fffffff || 1
}
