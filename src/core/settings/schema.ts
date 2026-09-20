/**
 * Every setting has a typed default here. Values are stored as JSON text in the settings table.
 * Later stages add keys to this interface; modules never read raw keys.
 */
export interface Settings {
  theme: 'dark' | 'light' | 'system'
  /** Hour (0-23) at which a new log day starts. 4 means a 01:30 drink belongs to yesterday. */
  dayStartHour: number
  'notifications.enabled': boolean
  'notifications.morningDigest': { enabled: boolean; time: string }
  'notifications.eveningDigest': { enabled: boolean; time: string }
  'notifications.timed': boolean
  lastExportAt: string | null
}

export const SETTINGS_DEFAULTS: Settings = {
  theme: 'dark',
  dayStartHour: 4,
  'notifications.enabled': false,
  'notifications.morningDigest': { enabled: true, time: '08:00' },
  'notifications.eveningDigest': { enabled: true, time: '20:30' },
  'notifications.timed': true,
  lastExportAt: null,
}

export type SettingKey = keyof Settings
