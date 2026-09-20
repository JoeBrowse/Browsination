import type { PendingNotification, PlannedNotification } from './types'

export interface ReconcilePlan {
  cancel: number[]
  schedule: PlannedNotification[]
}

const minute = (iso: string | null) => (iso ? Math.floor(Date.parse(iso) / 60_000) : NaN)

/**
 * Pure diff between what should exist and what the OS holds. Unchanged notifications are left
 * alone (no alarm churn); changed ones are rescheduled under the same id, which replaces them.
 */
export function reconcile(desired: PlannedNotification[], pending: PendingNotification[]): ReconcilePlan {
  const wanted = new Map(desired.map((d) => [d.id, d]))
  const have = new Map(pending.map((p) => [p.id, p]))
  const cancel = pending.filter((p) => !wanted.has(p.id)).map((p) => p.id)
  const schedule = desired.filter((d) => {
    const p = have.get(d.id)
    return !p || minute(p.at) !== minute(d.at) || p.title !== d.title || p.body !== d.body
  })
  return { cancel, schedule }
}
