import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'
import type { SqlDriver } from '../db/driver'
import type { LocalDay } from '../time/localDay'

/** Stable module keys. Stored in items.module and log_entries.module, so never renamed. */
export type ModuleId = 'brain' | 'life' | 'chess' | 'banjo' | 'snooker' | 'alcohol' | 'money' | 'work' | 'fitness'

export interface TodayContext {
  db: SqlDriver
  /** Today after the day-start-hour rule (for logs). */
  today: LocalDay
  /** Plain calendar date (for tasks and dates). */
  calendarToday: LocalDay
  now: Date
}

/** Data, not JSX: core renders cards, so every module gets the same look and the cap is enforced centrally. */
export interface TodayCard {
  /** Unique across the whole Today screen; used for dedupe and React keys. */
  key: string
  module: ModuleId | 'core'
  kind: 'overdue' | 'due' | 'event' | 'checkin' | 'nudge' | 'focus' | 'log'
  title: string
  sub?: string
  /** Lower shows first. 0 = must show. */
  priority: number
  /** Route to open on tap. */
  href?: string
  /** One-tap primary action (e.g. "Done", "Log"). */
  action?: { label: string; run: () => Promise<void> }
}

export type TodayContributor = (ctx: TodayContext) => Promise<TodayCard[]>

export interface ModuleDef {
  id: ModuleId
  /** One short word for the tray tile. */
  name: string
  icon: LucideIcon
  /** CSS colour; the only accent used inside the module's screens. */
  accent: string
  /** Tray order. */
  order: number
  /** Mounted under /m/<id>. */
  routes: RouteObject[]
  today?: TodayContributor[]
  /** Interactive Today panels owned by the module (check-in cards, quick logs). Rendered inside the module's accent scope. */
  panels?: { key: string; component: ComponentType }[]
  /** Short lines for the morning digest ("Sophie's birthday in 7 days"). Batched, never their own alarm. */
  digest?: (ctx: TodayContext) => Promise<string[]>
  /** Section rendered on the Settings screen under the module's name. */
  settings?: ComponentType
}
