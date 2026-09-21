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
  /** Body weight for the alcohol model (kg). */
  'alcohol.weightKg': number
  'alcohol.sex': 'male' | 'female'
  /** Usual bedtime 'HH:MM' and sleep length, for the sleep-impact estimate. */
  'alcohol.usualBedtime': string
  'alcohol.usualSleepHours': number
  /** Elimination rate in g/L per hour (population mean 0.15). */
  'alcohol.eliminationRate': number
  /** Absorption half-life in minutes (12 typical; 6 fasting, 20+ after a meal). */
  'alcohol.absorptionHalfLifeMin': number
  'caffeine.halfLifeHours': number
  /** Medication reminders as individual timed notifications. */
  'alcohol.medicationReminders': boolean
  /** Day of the month the money check-in becomes due (1-28). */
  'money.checkInDay': number
  /** Mention a due check-in in the morning digest. */
  'money.checkInDigest': boolean
  /** Card payment due dates as timed reminders, this many days ahead, at this time. */
  'money.paymentReminders': boolean
  'money.paymentLeadDays': number
  'money.reminderTime': string
  /** App lock: off, the money module only, or the whole app. */
  'lock.mode': 'off' | 'money' | 'app'
  /** PBKDF2 record of the PIN (never the PIN itself). */
  'lock.pin': { hash: string; salt: string; iterations: number; length: number } | null
  'lock.biometric': boolean
  /** Seconds in the background before the lock re-engages (0 = straight away). */
  'lock.graceSeconds': number
  /** Days ahead that project key dates and progression milestones appear on Today (0 = off). */
  'work.leadDays': number
  /** Mention them in the morning digest too. */
  'work.digest': boolean
  /** Weekly review: day of week (0 = Sunday) and time it becomes due, with an optional timed reminder. */
  'review.day': number
  'review.time': string
  'review.reminder': boolean
  /** Focus timer defaults (minutes) and the end-of-session notification. */
  'focus.minutes': number
  'focus.breakMinutes': number
  'focus.endNotification': boolean
  /** Fitness: the unit every set is logged in, rest timer defaults, and the recovery pace. */
  'fitness.weightUnit': 'kg' | 'lb'
  'fitness.restCompound': number
  'fitness.restIsolation': number
  'fitness.startingSets': number
  'fitness.recoveryPace': 'faster' | 'normal' | 'slower'
  /** Bodyweight goal in the weight unit (null = no goal). */
  'fitness.weightGoal': number | null
  'fitness.heightCm': number | null
  /** Workout reminder nudges on Today when nothing was trained for this many days (0 = off). */
  'fitness.nudgeDays': number
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
  'alcohol.weightKg': 80,
  'alcohol.sex': 'male',
  'alcohol.usualBedtime': '23:00',
  'alcohol.usualSleepHours': 8,
  'alcohol.eliminationRate': 0.15,
  'alcohol.absorptionHalfLifeMin': 12,
  'caffeine.halfLifeHours': 5,
  'alcohol.medicationReminders': true,
  'money.checkInDay': 1,
  'money.checkInDigest': true,
  'money.paymentReminders': true,
  'money.paymentLeadDays': 3,
  'money.reminderTime': '09:00',
  'lock.mode': 'off',
  'lock.pin': null,
  'lock.biometric': false,
  'lock.graceSeconds': 60,
  'work.leadDays': 7,
  'work.digest': true,
  'review.day': 0,
  'review.time': '18:00',
  'review.reminder': true,
  'focus.minutes': 25,
  'focus.breakMinutes': 5,
  'focus.endNotification': true,
  'fitness.weightUnit': 'kg',
  'fitness.restCompound': 120,
  'fitness.restIsolation': 90,
  'fitness.startingSets': 1,
  'fitness.recoveryPace': 'normal',
  'fitness.weightGoal': null,
  'fitness.heightCm': null,
  'fitness.nudgeDays': 3,
}

export type SettingKey = keyof Settings
