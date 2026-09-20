import type { Row } from '../driver'

/**
 * A migration is plain SQL, applied once, inside one transaction. Migrations are append-only:
 * once a stage is tagged its migration file is frozen (the runner checks a checksum).
 */
export interface Migration {
  version: number
  name: string
  /** Statements run in order. Additive DDL preferred; rebuild-copy-drop-rename for anything else. */
  statements: string[]
  /** Tables this migration creates, parent before child. Drives export/import order. */
  tables?: string[]
  /** One realistic row per table (every column set). Used by the generic round-trip test. */
  fixtures?: () => Record<string, Row[]>
}
