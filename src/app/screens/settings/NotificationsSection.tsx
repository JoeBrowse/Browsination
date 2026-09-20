import { useState } from 'react'
import { checkExactAlarmPermission, checkNotificationPermission, requestNotificationPermission, type PermissionState } from '@/core/platform/notifications'
import type { Settings } from '@/core/settings/schema'
import { Card, Toggle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../../services'

/** Toggles are stored settings. Scheduling that honours them arrives with Stage 1. */
export function NotificationsSection() {
  const s = useServices()
  const all = useQuery(() => s.settings.all(), ['settings'])
  const perm = useQuery(async () => ({ display: await checkNotificationPermission(), exact: await checkExactAlarmPermission() }), [])
  const [requested, setRequested] = useState<PermissionState | null>(null)
  const v = all.data
  if (!v) return <Card>…</Card>

  const set = <K extends keyof Settings>(k: K, value: Settings[K]) => void s.settings.set(k, value)
  const enable = async (on: boolean) => {
    set('notifications.enabled', on)
    if (on) setRequested(await requestNotificationPermission())
  }
  const digest = (key: 'notifications.morningDigest' | 'notifications.eveningDigest', label: string) => (
    <div className="row">
      <span className="grow">{label}</span>
      <input
        type="time"
        value={v[key].time}
        style={{ width: 120 }}
        aria-label={`${label} time`}
        onChange={(e) => set(key, { ...v[key], time: e.target.value })}
        disabled={!v['notifications.enabled']}
      />
      <Toggle label={label} checked={v[key].enabled} onChange={(on) => set(key, { ...v[key], enabled: on })} />
    </div>
  )
  const status = requested ?? perm.data?.display
  return (
    <Card>
      <div className="row">
        <span className="grow">Notifications</span>
        <Toggle label="Notifications" checked={v['notifications.enabled']} onChange={(on) => void enable(on)} />
      </div>
      {digest('notifications.morningDigest', 'Morning digest')}
      {digest('notifications.eveningDigest', 'Evening digest')}
      <div className="row">
        <span className="grow">Timed reminders</span>
        <Toggle label="Timed reminders" checked={v['notifications.timed']} onChange={(on) => set('notifications.timed', on)} />
      </div>
      {status && status !== 'unsupported' ? (
        <div className="muted small">
          Permission: {status}
          {perm.data?.exact && perm.data.exact !== 'unsupported' ? `, exact alarms: ${perm.data.exact}` : ''}
        </div>
      ) : null}
    </Card>
  )
}
