import type { SqlDriver } from '../db/driver'
import { exportDatabase, serializeEnvelope } from './exportDb'
import type { FileStore } from './fileStore'
import { parseEnvelope, type ExportEnvelope } from './format'

export const SNAPSHOT_DIR = 'backups'
export const SNAPSHOT_KEEP = 10

export interface SnapshotInfo {
  name: string
  reason: string
  schemaVersion: number
  at: string
}

const NAME_RE = /^snapshot-([a-z-]+)-v(\d+)-(\d{8}T\d{6}\d{3}Z)\.json$/

/**
 * A snapshot is the same JSON envelope as a manual export, written to app storage.
 * Taken automatically before a migration and before an import, or manually from Settings.
 */
export async function createSnapshot(db: SqlDriver, store: FileStore, reason: string, appVersion = ''): Promise<SnapshotInfo> {
  if (!/^[a-z-]+$/.test(reason)) throw new Error(`Bad snapshot reason: ${reason}`)
  const envelope = await exportDatabase(db, appVersion)
  const at = envelope.exportedAt
  const compact = at.replace(/[-:.]/g, '')
  const name = `snapshot-${reason}-v${envelope.schemaVersion}-${compact}.json`
  await store.write(`${SNAPSHOT_DIR}/${name}`, serializeEnvelope(envelope))
  await pruneSnapshots(store)
  return { name, reason, schemaVersion: envelope.schemaVersion, at }
}

export function parseSnapshotName(name: string): SnapshotInfo | null {
  const m = NAME_RE.exec(name)
  if (!m) return null
  const [, reason, v, stamp] = m as unknown as [string, string, string, string]
  const at = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}.${stamp.slice(15, 18)}Z`
  return { name, reason, schemaVersion: Number(v), at }
}

/** Newest first. */
export async function listSnapshots(store: FileStore): Promise<SnapshotInfo[]> {
  const names = await store.list(SNAPSHOT_DIR).catch(() => [] as string[])
  return names
    .map(parseSnapshotName)
    .filter((s): s is SnapshotInfo => s !== null)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
}

export async function readSnapshot(store: FileStore, name: string): Promise<ExportEnvelope> {
  return parseEnvelope(await store.read(`${SNAPSHOT_DIR}/${name}`))
}

export async function pruneSnapshots(store: FileStore, keep = SNAPSHOT_KEEP): Promise<void> {
  const all = await listSnapshots(store)
  for (const s of all.slice(keep)) await store.remove(`${SNAPSHOT_DIR}/${s.name}`)
}
