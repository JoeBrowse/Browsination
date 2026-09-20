import type { Row } from '../db/driver'

export const EXPORT_FORMAT = 'browsination'
export const EXPORT_FORMAT_VERSION = 1

/**
 * The export file. Rows are stored exactly as SQLite holds them (JSON columns stay strings,
 * timestamps stay ISO strings) so a round trip is byte-for-byte.
 */
export interface ExportEnvelope {
  format: typeof EXPORT_FORMAT
  formatVersion: number
  schemaVersion: number
  exportedAt: string
  appVersion: string
  tables: Record<string, Row[]>
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export function parseEnvelope(text: string): ExportEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ImportError('Not a JSON file')
  }
  return validateEnvelope(parsed)
}

export function validateEnvelope(x: unknown): ExportEnvelope {
  if (!x || typeof x !== 'object') throw new ImportError('Not an export file')
  const e = x as Partial<ExportEnvelope>
  if (e.format !== EXPORT_FORMAT) throw new ImportError('Not a Browsination export')
  if (typeof e.formatVersion !== 'number' || e.formatVersion > EXPORT_FORMAT_VERSION)
    throw new ImportError('Export format is newer than this app')
  if (typeof e.schemaVersion !== 'number' || e.schemaVersion < 1) throw new ImportError('Missing schema version')
  if (!e.tables || typeof e.tables !== 'object') throw new ImportError('Missing tables')
  for (const [name, rows] of Object.entries(e.tables)) {
    if (!Array.isArray(rows)) throw new ImportError(`Table ${name} is not a list of rows`)
  }
  return {
    format: EXPORT_FORMAT,
    formatVersion: e.formatVersion,
    schemaVersion: e.schemaVersion,
    exportedAt: typeof e.exportedAt === 'string' ? e.exportedAt : '',
    appVersion: typeof e.appVersion === 'string' ? e.appVersion : '',
    tables: e.tables as Record<string, Row[]>,
  }
}

export function rowCounts(e: ExportEnvelope): Record<string, number> {
  return Object.fromEntries(Object.entries(e.tables).map(([t, rows]) => [t, rows.length]))
}
