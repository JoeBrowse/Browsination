import type { SqlDriver } from '../db/driver'
import { dbEvents } from '../db/events'
import { nowIso } from '../ids'
import { SETTINGS_DEFAULTS, type SettingKey, type Settings } from '../settings/schema'
import { parseJson } from './base'

export function settingsRepo(db: SqlDriver) {
  return {
    async get<K extends SettingKey>(key: K): Promise<Settings[K]> {
      const rows = await db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])
      const row = rows[0]
      if (!row) return SETTINGS_DEFAULTS[key]
      return parseJson<Settings[K]>(row.value, SETTINGS_DEFAULTS[key])
    },
    async set<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
      await db.run('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', [
        key,
        JSON.stringify(value),
        nowIso(),
      ])
      dbEvents.emit('settings')
    },
    async all(): Promise<Settings> {
      const rows = await db.query<{ key: string; value: string }>('SELECT key, value FROM settings')
      const out: Record<string, unknown> = { ...SETTINGS_DEFAULTS }
      for (const r of rows) if (r.key in SETTINGS_DEFAULTS) out[r.key] = parseJson(r.value, out[r.key])
      return out as unknown as Settings
    },
  }
}

export type SettingsRepo = ReturnType<typeof settingsRepo>
