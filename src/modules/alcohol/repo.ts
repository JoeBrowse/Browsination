import type { SqlDriver } from '@/core/db/driver'
import { newId, nowIso } from '@/core/ids'
import { deleteRow, getRow, insertRow, parseJson, updateRow } from '@/core/repos/base'
import { logEntriesRepo, type LogEntry } from '@/core/repos/logEntries'
import type { Dose } from './caffeine'
import type { Drink } from './model'
import { describeDrink, drinkMeasures, type DrinkSpec } from './presets'

export interface MedicationRow {
  id: string
  name: string
  dose: string
  /** JSON list of 'HH:MM'. */
  times: string
  active: number
  notes: string
  created_at: string
  updated_at: string
}

export const LOG = { drink: 'drink', caffeine: 'caffeine', medication: 'medication', morningAfter: 'morning_after' } as const
export const MEDICATION_ENTITY = 'alcohol.medication'

export function alcoholRepo(db: SqlDriver) {
  const logs = logEntriesRepo(db)
  return {
    logs,
    /** Log a drink in grams of ethanol (value) with UK units and the measure in the payload. */
    logDrink(spec: DrinkSpec, ts?: string): Promise<LogEntry> {
      const m = drinkMeasures(spec)
      return logs.add({ type: LOG.drink, module: 'alcohol', value: m.grams, unit: 'g', ts, payload: { units: m.units, volume_ml: spec.volumeMl, abv: spec.abv, preset: spec.preset, name: spec.name || describeDrink(spec) } })
    },
    lastDrink: () => logs.lastOfType(LOG.drink),
    /** Drinks since an instant, as model input. */
    async drinksSince(fromTs: string): Promise<Drink[]> {
      const rows = await db.query<{ ts: string; value: number }>(`SELECT ts, value FROM log_entries WHERE type = ? AND ts >= ? AND value IS NOT NULL ORDER BY ts`, [LOG.drink, fromTs])
      return rows.map((r) => ({ atMs: Date.parse(r.ts), grams: r.value }))
    },
    gramsBetween: async (fromTs: string, toTs: string) => (await db.query<{ g: number | null }>(`SELECT SUM(value) AS g FROM log_entries WHERE type = ? AND ts >= ? AND ts < ?`, [LOG.drink, fromTs, toTs]))[0]?.g ?? 0,
    drinksBetween: (fromTs: string, toTs: string) => logs.listByType(LOG.drink, fromTs, toTs),

    logCaffeine(mg: number, preset: string, name: string, ts?: string): Promise<LogEntry> {
      return logs.add({ type: LOG.caffeine, module: 'alcohol', value: mg, unit: 'mg', ts, payload: { preset, name } })
    },
    lastCaffeine: () => logs.lastOfType(LOG.caffeine),
    async dosesSince(fromTs: string): Promise<Dose[]> {
      const rows = await db.query<{ ts: string; value: number }>(`SELECT ts, value FROM log_entries WHERE type = ? AND ts >= ? AND value IS NOT NULL ORDER BY ts`, [LOG.caffeine, fromTs])
      return rows.map((r) => ({ atMs: Date.parse(r.ts), mg: r.value }))
    },
    caffeineBetween: (fromTs: string, toTs: string) => logs.listByType(LOG.caffeine, fromTs, toTs),

    medications: (activeOnly = true) => db.query<MedicationRow>(`SELECT * FROM medications ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY name COLLATE NOCASE`),
    medication: (id: string) => getRow<MedicationRow>(db, 'medications', id),
    medicationTimes: (m: MedicationRow) => parseJson<string[]>(m.times, []),
    async addMedication(name: string, dose: string, times: string[]): Promise<MedicationRow> {
      const t = nowIso()
      const row: MedicationRow = { id: newId(), name: name.trim(), dose, times: JSON.stringify(times), active: 1, notes: '', created_at: t, updated_at: t }
      await insertRow(db, 'medications', row)
      return row
    },
    updateMedication: (id: string, patch: Partial<Omit<MedicationRow, 'id' | 'created_at'>>) => updateRow(db, 'medications', id, { ...patch, updated_at: nowIso() }),
    removeMedication: (id: string) => deleteRow(db, 'medications', id),
    logMedication: (m: MedicationRow, ts?: string) => logs.add({ type: LOG.medication, module: 'alcohol', value: 1, ts, entity_type: MEDICATION_ENTITY, entity_id: m.id, payload: { name: m.name, dose: m.dose } }),
    medicationLogsBetween: (fromTs: string, toTs: string) => logs.listByType(LOG.medication, fromTs, toTs),

    logMorningAfter: (score: number, unitsPreviousDay: number) => logs.add({ type: LOG.morningAfter, module: 'alcohol', value: score, unit: 'score', payload: { units_previous_day: unitsPreviousDay } }),
    morningAfterBetween: (fromTs: string, toTs: string) => logs.listByType(LOG.morningAfter, fromTs, toTs),
  }
}

export type AlcoholRepo = ReturnType<typeof alcoholRepo>
