import { useCallback } from 'react'
import { endsAt, FOCUS_LOG_TYPE, FOCUS_NOTIFICATION_KEY, useFocus } from '@/core/focus/focusStore'
import { notificationId } from '@/core/notifications/types'
import { checkNotificationPermission, createNotificationPort } from '@/core/platform/notifications'
import type { ItemRow } from '@/core/repos/items'
import { useServices } from '../services'
import { toast } from '../shellStore'

const port = createNotificationPort()
const END_ID = notificationId(FOCUS_NOTIFICATION_KEY)

/** Start and stop focus sessions: the store keeps the clock, this logs the time and rings the bell. */
export function useFocusSession() {
  const s = useServices()
  const session = useFocus((f) => f.session)
  const start = useCallback(
    async (item: Pick<ItemRow, 'id' | 'title' | 'module'> | null, minutes: number) => {
      const sess = useFocus.getState().start({ itemId: item?.id ?? null, title: item?.title ?? 'Focus', module: item?.module ?? null, minutes })
      const all = await s.settings.all()
      if (all['notifications.enabled'] && all['focus.endNotification'] && (await checkNotificationPermission()) === 'granted') {
        try {
          await port.schedule([{ id: END_ID, key: FOCUS_NOTIFICATION_KEY, at: new Date(endsAt(sess)).toISOString(), title: 'Focus done', body: sess.title, channel: 'timed', route: '/today' }])
        } catch {
          /* best effort */
        }
      }
    },
    [s.settings],
  )
  const stop = useCallback(async () => {
    const ended = useFocus.getState().stop()
    if (!ended) return
    try {
      await port.cancel([END_ID])
    } catch {
      /* best effort */
    }
    await s.logs.add({
      type: FOCUS_LOG_TYPE,
      module: ended.module,
      ts: new Date(ended.startedAt).toISOString(),
      ts_end: new Date(ended.endedAt).toISOString(),
      value: ended.spentMinutes,
      unit: 'min',
      entity_type: ended.itemId ? 'item' : null,
      entity_id: ended.itemId,
      payload: { title: ended.title, planned_minutes: ended.minutes },
    })
    toast(`Focus ${ended.spentMinutes} min`)
  }, [s.logs])
  return { session, start, stop }
}
