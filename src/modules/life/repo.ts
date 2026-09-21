import type { SqlDriver } from '@/core/db/driver'
import { newId, nowIso } from '@/core/ids'
import { nextOccurrence, parseRule } from '@/core/recurrence/rrule'
import { deleteRow, getRow, insertRow, parseJson, updateRow } from '@/core/repos/base'
import { itemsRepo, type ItemRow } from '@/core/repos/items'
import { logEntriesRepo } from '@/core/repos/logEntries'
import { peopleRepo } from '@/core/repos/people'
import type { LocalDay } from '@/core/time/localDay'

export type ListKey = 'house' | 'garden' | 'buy' | 'general'
export const LISTS: { key: ListKey; label: string }[] = [
  { key: 'house', label: 'House' },
  { key: 'garden', label: 'Garden' },
  { key: 'buy', label: 'Buy' },
  { key: 'general', label: 'General' },
]
export const LIST_ENTITY = 'life.list'
export const TRIP_ENTITY = 'life.trip'

export interface BuyDetailsRow {
  item_id: string
  price_pence: number | null
  url: string | null
  created_at: string
  updated_at: string
}
export interface DateNightRow {
  id: string
  title: string
  status: 'idea' | 'planned' | 'done' | 'skipped'
  date: string | null
  place: string
  budget_pence: number | null
  spent_pence: number | null
  notes: string
  created_at: string
  updated_at: string
}
export interface TripRow {
  id: string
  name: string
  destination: string
  start_date: string | null
  end_date: string | null
  budget_pence: number | null
  spent_pence: number | null
  /** JSON: [{ label, ref }] */
  booking_refs: string
  notes: string
  status: 'idea' | 'planned' | 'done'
  /** Savings goal this trip's budget belongs to (Stage 7). */
  goal_id: string | null
  created_at: string
  updated_at: string
}
export interface FlightPriceRow {
  id: string
  trip_id: string
  checked_on: string
  route: string
  price_pence: number
  url: string | null
  created_at: string
  updated_at: string
}
export type AdminKind = 'renewal' | 'health' | 'subscription' | 'document'
export interface AdminRow {
  id: string
  kind: AdminKind
  name: string
  due_date: string | null
  recurrence: string | null
  cost_pence: number | null
  location: string
  notes: string
  last_done: string | null
  created_at: string
  updated_at: string
}

const stamped = <T extends object>(row: T) => ({ ...row, created_at: nowIso(), updated_at: nowIso() })

export function lifeRepo(db: SqlDriver) {
  const items = itemsRepo(db)
  const people = peopleRepo(db)
  const logs = logEntriesRepo(db)
  return {
    items,
    people,
    // lists over items
    listItems: (list: ListKey) =>
      db.query<ItemRow>(`SELECT * FROM items WHERE entity_type = ? AND entity_id = ? AND status IN ('inbox','todo','waiting') ORDER BY priority DESC, created_at`, [LIST_ENTITY, list]),
    addListItem: (list: ListKey, title: string) => items.create({ title, module: 'life', status: 'todo', entity_type: LIST_ENTITY, entity_id: list }),
    buyDetails: (item_id: string) => getRow<BuyDetailsRow>(db, 'buy_details', item_id, 'item_id'),
    async setBuyDetails(item_id: string, price_pence: number | null, url: string | null): Promise<void> {
      const existing = await getRow<BuyDetailsRow>(db, 'buy_details', item_id, 'item_id')
      if (existing) await updateRow(db, 'buy_details', item_id, { price_pence, url, updated_at: nowIso() }, 'item_id')
      else await insertRow(db, 'buy_details', stamped({ item_id, price_pence, url }))
    },
    buyDetailsFor: (ids: string[]) =>
      ids.length ? db.query<BuyDetailsRow>(`SELECT * FROM buy_details WHERE item_id IN (${ids.map(() => '?').join(',')})`, ids) : Promise.resolve([] as BuyDetailsRow[]),

    // people
    async contacted(personId: string): Promise<void> {
      const t = nowIso()
      await people.update(personId, { last_contacted_at: t })
      await logs.add({ type: 'contact', module: 'life', value: 1, entity_type: 'people.person', entity_id: personId, ts: t })
    },

    // date nights
    dateNights: () => db.query<DateNightRow>(`SELECT * FROM date_nights ORDER BY CASE status WHEN 'planned' THEN 0 WHEN 'idea' THEN 1 ELSE 2 END, date DESC, created_at DESC`),
    async addDateNight(input: Partial<DateNightRow> & { title: string }): Promise<DateNightRow> {
      const row: DateNightRow = stamped({ id: newId(), title: input.title.trim(), status: input.status ?? 'idea', date: input.date ?? null, place: input.place ?? '', budget_pence: input.budget_pence ?? null, spent_pence: input.spent_pence ?? null, notes: input.notes ?? '' })
      await insertRow(db, 'date_nights', row)
      return row
    },
    updateDateNight: (id: string, patch: Partial<Omit<DateNightRow, 'id' | 'created_at'>>) => updateRow(db, 'date_nights', id, { ...patch, updated_at: nowIso() }),
    removeDateNight: (id: string) => deleteRow(db, 'date_nights', id),
    async completeDateNight(id: string, spent_pence: number | null): Promise<void> {
      const row = await getRow<DateNightRow>(db, 'date_nights', id)
      if (!row) return
      await updateRow(db, 'date_nights', id, { status: 'done', spent_pence, updated_at: nowIso() })
      await logs.add({ type: 'date_night', module: 'life', value: 1, entity_type: 'life.date_night', entity_id: id, payload: { title: row.title, spent_pence } })
    },
    nextPlannedDate: async (today: LocalDay) => (await db.query<DateNightRow>(`SELECT * FROM date_nights WHERE status = 'planned' AND date >= ? ORDER BY date LIMIT 1`, [today]))[0] ?? null,

    // trips
    trips: () => db.query<TripRow>(`SELECT * FROM trips ORDER BY CASE status WHEN 'planned' THEN 0 WHEN 'idea' THEN 1 ELSE 2 END, start_date`),
    trip: (id: string) => getRow<TripRow>(db, 'trips', id),
    async addTrip(input: Partial<TripRow> & { name: string }): Promise<TripRow> {
      const row: TripRow = stamped({ id: newId(), name: input.name.trim(), destination: input.destination ?? '', start_date: input.start_date ?? null, end_date: input.end_date ?? null, budget_pence: input.budget_pence ?? null, spent_pence: input.spent_pence ?? null, booking_refs: input.booking_refs ?? '[]', notes: input.notes ?? '', status: input.status ?? 'planned', goal_id: input.goal_id ?? null })
      await insertRow(db, 'trips', row)
      return row
    },
    updateTrip: (id: string, patch: Partial<Omit<TripRow, 'id' | 'created_at'>>) => updateRow(db, 'trips', id, { ...patch, updated_at: nowIso() }),
    removeTrip: (id: string) => deleteRow(db, 'trips', id),
    bookingRefs: (t: TripRow) => parseJson<{ label: string; ref: string }[]>(t.booking_refs, []),
    checklist: (tripId: string) => items.listForEntity(TRIP_ENTITY, tripId),
    addChecklistItem: (tripId: string, title: string) => items.create({ title, module: 'life', status: 'todo', entity_type: TRIP_ENTITY, entity_id: tripId }),
    upcomingTrips: (today: LocalDay, withinDays: number) =>
      db.query<TripRow>(`SELECT * FROM trips WHERE status = 'planned' AND start_date IS NOT NULL AND start_date >= ? AND start_date <= date(?, '+' || ? || ' days') ORDER BY start_date`, [today, today, withinDays]),
    flightPrices: (tripId: string) => db.query<FlightPriceRow>(`SELECT * FROM flight_prices WHERE trip_id = ? ORDER BY checked_on, created_at`, [tripId]),
    async addFlightPrice(input: Omit<FlightPriceRow, 'id' | 'created_at' | 'updated_at'>): Promise<FlightPriceRow> {
      const row: FlightPriceRow = stamped({ id: newId(), ...input })
      await insertRow(db, 'flight_prices', row)
      return row
    },
    removeFlightPrice: (id: string) => deleteRow(db, 'flight_prices', id),

    // life admin
    admin: (kind?: AdminKind) =>
      kind ? db.query<AdminRow>(`SELECT * FROM admin_items WHERE kind = ? ORDER BY due_date IS NULL, due_date, name`, [kind]) : db.query<AdminRow>(`SELECT * FROM admin_items ORDER BY due_date IS NULL, due_date, name`),
    async addAdmin(input: Partial<AdminRow> & { kind: AdminKind; name: string }): Promise<AdminRow> {
      const row: AdminRow = stamped({ id: newId(), kind: input.kind, name: input.name.trim(), due_date: input.due_date ?? null, recurrence: input.recurrence ?? null, cost_pence: input.cost_pence ?? null, location: input.location ?? '', notes: input.notes ?? '', last_done: input.last_done ?? null })
      await insertRow(db, 'admin_items', row)
      return row
    },
    updateAdmin: (id: string, patch: Partial<Omit<AdminRow, 'id' | 'created_at'>>) => updateRow(db, 'admin_items', id, { ...patch, updated_at: nowIso() }),
    removeAdmin: (id: string) => deleteRow(db, 'admin_items', id),
    /** Mark done today: recurring items move to the next occurrence, one-offs keep their date. */
    async adminDone(id: string, today: LocalDay): Promise<void> {
      const row = await getRow<AdminRow>(db, 'admin_items', id)
      if (!row) return
      const rule = parseRule(row.recurrence)
      const next = rule ? nextOccurrence(rule, today, today) : row.due_date
      await updateRow(db, 'admin_items', id, { last_done: today, due_date: next, updated_at: nowIso() })
      await logs.add({ type: 'admin_done', module: 'life', value: 1, entity_type: 'life.admin', entity_id: id, payload: { name: row.name, kind: row.kind } })
    },
  }
}

export type LifeRepo = ReturnType<typeof lifeRepo>
