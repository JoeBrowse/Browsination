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
  /** Days before a birthday to mention it (empty = off). */
  'life.birthdayLeadDays': number[]
  /** Nudge when no date night is planned within this many weeks (0 = off). */
  'life.dateNightNudgeWeeks': number
  /** Days before a renewal, appointment or subscription to mention it (0 = off). */
  'life.adminLeadDays': number
  /** Keep-in-touch nudges on Today. */
  'life.keepInTouch': boolean
}

export const SETTINGS_DEFAULTS: Settings = {
  theme: 'dark',
  dayStartHour: 4,
  'notifications.enabled': false,
  'notifications.morningDigest': { enabled: true, time: '08:00' },
  'notifications.eveningDigest': { enabled: true, time: '20:30' },
  'notifications.timed': true,
  lastExportAt: null,
  'life.birthdayLeadDays': [21, 7],
  'life.dateNightNudgeWeeks': 3,
  'life.adminLeadDays': 14,
  'life.keepInTouch': true,
}

export type SettingKey = keyof Settings
