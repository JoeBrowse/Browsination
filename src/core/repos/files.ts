import type { SqlDriver } from '../db/driver'
import { newId, nowIso } from '../ids'
import { deleteRow, getRow, insertRow, updateRow } from './base'

/** File metadata. Bytes live on disk under the app data directory at `rel_path`. */
export interface FileRow {
  id: string
  module: string | null
  entity_type: string | null
  entity_id: string | null
  rel_path: string
  mime: string
  title: string
  created_at: string
  updated_at: string
}

export type NewFile = Omit<FileRow, 'id' | 'created_at' | 'updated_at'>

export function filesRepo(db: SqlDriver) {
  return {
    async create(input: NewFile): Promise<FileRow> {
      const t = nowIso()
      const row: FileRow = { id: newId(), ...input, created_at: t, updated_at: t }
      await insertRow(db, 'files', row)
      return row
    },
    get: (id: string) => getRow<FileRow>(db, 'files', id),
    update: (id: string, patch: Partial<Omit<FileRow, 'id' | 'created_at'>>) => updateRow(db, 'files', id, { ...patch, updated_at: nowIso() }),
    remove: (id: string) => deleteRow(db, 'files', id),
    forEntity: (entity_type: string, entity_id: string) =>
      db.query<FileRow>('SELECT * FROM files WHERE entity_type = ? AND entity_id = ? ORDER BY created_at', [entity_type, entity_id]),
    listByModule: (module: string) => db.query<FileRow>('SELECT * FROM files WHERE module = ? ORDER BY title COLLATE NOCASE', [module]),
  }
}

export type FilesRepo = ReturnType<typeof filesRepo>
