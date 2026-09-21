import { SETTINGS_DEFAULTS } from '@/core/settings/schema'
import { vi } from 'vitest'
import type { Services } from '@/app/services'
import type { ItemRow } from '@/core/repos/items'

/** Minimal Services double for component tests. Only the members a screen touches are real. */
export function fakeServices(over: Partial<Services> = {}): Services {
  const base = {
    db: { query: async () => [], run: async () => ({ changes: 0 }), exec: async () => undefined, transaction: async (fn: (tx: unknown) => unknown) => fn(undefined), close: async () => undefined } as never,
    files: {} as never,
    appVersion: 'test',
    schemaVersion: 1,
    items: { create: vi.fn(async (i: { title: string }) => makeItem({ title: i.title })), setStatus: vi.fn(async () => true), update: vi.fn(async () => true), remove: vi.fn(async () => true), get: vi.fn(async () => null), listByStatus: vi.fn(async () => []), count: vi.fn(async () => 0), listForEntity: vi.fn(async () => []) },
    tasks: { focus: vi.fn(async () => []), overdue: vi.fn(async () => []), dueOn: vi.fn(async () => []), dueBetween: vi.fn(async () => []), chaseDue: vi.fn(async () => []), open: vi.fn(async () => []), withReminders: vi.fn(async () => []), doneBetween: vi.fn(async () => []), recentDone: vi.fn(async () => []), setFocus: vi.fn(async () => undefined), counts: vi.fn() },
    logs: {} as never,
    people: { list: vi.fn(async () => []), create: vi.fn() } as never,
    fileRows: {} as never,
    settings: { get: vi.fn(async (k: string) => (k === 'dayStartHour' ? 4 : ((SETTINGS_DEFAULTS as unknown as Record<string, unknown>)[k] ?? null))), set: vi.fn(async () => undefined), all: vi.fn(async () => SETTINGS_DEFAULTS) } as never,
  }
  return { ...(base as unknown as Services), ...over }
}

let n = 0
export function makeItem(over: Partial<ItemRow> = {}): ItemRow {
  n += 1
  const t = '2026-09-20T10:00:00.000Z'
  return {
    id: `item-${n}`,
    title: `Item ${n}`,
    notes: '',
    module: null,
    status: 'todo',
    due_date: null,
    due_time: null,
    reminder_at: null,
    recurrence: null,
    priority: 0,
    entity_type: null,
    entity_id: null,
    created_at: t,
    updated_at: t,
    completed_at: null,
    waiting_person_id: null,
    chase_date: null,
    focus_date: null,
    series_id: null,
    recur_from: 'due',
    ...over,
  }
}
