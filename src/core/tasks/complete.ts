import { nextOccurrence, parseRule } from '../recurrence/rrule'
import type { ItemRow, ItemsRepo } from '../repos/items'
import type { LocalDay } from '../time/localDay'

/**
 * Marks an item done. A recurring item also spawns its next occurrence as a fresh row in the
 * same series, so the wins log keeps every completed instance. Missed occurrences are skipped:
 * the next due date is always strictly after today (forgiving, never a backlog).
 *  - recur_from 'due':  the series stays aligned to the original due date
 *  - recur_from 'done': the next one is counted from today
 */
export async function completeItem(items: ItemsRepo, item: ItemRow, today: LocalDay): Promise<ItemRow | null> {
  await items.setStatus(item.id, 'done')
  const rule = parseRule(item.recurrence)
  if (!rule) return null
  const anchor = item.recur_from === 'done' ? today : (item.due_date ?? today)
  const next = nextOccurrence(rule, anchor, today)
  const time = item.reminder_at?.slice(11) ?? null
  return items.create({
    title: item.title,
    notes: item.notes,
    module: item.module,
    status: 'todo',
    due_date: next,
    due_time: item.due_time,
    reminder_at: time ? `${next}T${time}` : null,
    recurrence: item.recurrence,
    recur_from: item.recur_from,
    priority: item.priority,
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    series_id: item.series_id ?? item.id,
  })
}

/** Undo a completion made moments ago. The spawned occurrence, if any, is removed. */
export async function uncompleteItem(items: ItemsRepo, item: ItemRow, spawned: ItemRow | null): Promise<void> {
  if (spawned) await items.remove(spawned.id)
  await items.setStatus(item.id, item.status === 'done' ? 'todo' : item.status)
}
