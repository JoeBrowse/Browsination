import { useState } from 'react'
import { exportDatabase, exportFilename, serializeEnvelope } from '@/core/backup/exportDb'
import { parseEnvelope, rowCounts, type ExportEnvelope } from '@/core/backup/format'
import { importDatabase } from '@/core/backup/importDb'
import { createSnapshot, listSnapshots, readSnapshot, type SnapshotInfo } from '@/core/backup/snapshots'
import { canShare, pickTextFile, saveExportFile, shareFile } from '@/core/platform/exportTransport'
import { Button, Card, ListRow } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../../services'
import { toast } from '../../shellStore'

export function DataSection() {
  const s = useServices()
  const [busy, setBusy] = useState(false)
  const [lastUri, setLastUri] = useState<string | null>(null)
  const [pending, setPending] = useState<{ env: ExportEnvelope; label: string } | null>(null)
  const lastExport = useQuery(() => s.settings.get('lastExportAt'), ['settings'])
  const snapshots = useQuery(() => listSnapshots(s.files), ['*'])
  const shareable = useQuery(() => canShare(), [])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const doExport = () =>
    run(async () => {
      const env = await exportDatabase(s.db, s.appVersion)
      const saved = await saveExportFile(exportFilename(), serializeEnvelope(env))
      await s.settings.set('lastExportAt', env.exportedAt)
      setLastUri(saved.uri)
      toast(`Saved to ${saved.location}`)
    })

  const pickImport = () =>
    run(async () => {
      const text = await pickTextFile()
      if (!text) return
      setPending({ env: parseEnvelope(text), label: 'file' })
    })

  const confirmImport = () =>
    run(async () => {
      if (!pending) return
      const env = pending.env
      setPending(null)
      await createSnapshot(s.db, s.files, 'pre-import', s.appVersion)
      const r = await importDatabase(s.db, env)
      toast(`Restored ${Object.values(r.counts).reduce((a, b) => a + b, 0)} rows`)
    })

  const restoreSnapshot = (snap: SnapshotInfo) =>
    run(async () => setPending({ env: await readSnapshot(s.files, snap.name), label: snap.name }))

  const counts = pending ? rowCounts(pending.env) : {}

  return (
    <Card>
      <div className="btn-row">
        <Button variant="primary" onClick={doExport} disabled={busy}>
          Export
        </Button>
        <Button onClick={pickImport} disabled={busy}>
          Import
        </Button>
        {lastUri && shareable.data ? <Button onClick={() => void shareFile(lastUri, 'Browsination export')}>Share</Button> : null}
      </div>
      <div className="muted small" style={{ marginTop: 8 }}>
        {lastExport.data ? `Last export ${new Date(lastExport.data).toLocaleString('en-GB')}` : 'Never exported'}
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <span className="grow">Snapshots</span>
        <Button onClick={() => run(async () => void (await createSnapshot(s.db, s.files, 'manual', s.appVersion)))} disabled={busy}>
          Snapshot now
        </Button>
      </div>
      <div className="list">
        {(snapshots.data ?? []).map((snap) => (
          <ListRow
            key={snap.name}
            title={`${snap.reason} v${snap.schemaVersion}`}
            sub={new Date(snap.at).toLocaleString('en-GB')}
            right={
              <Button onClick={() => restoreSnapshot(snap)} disabled={busy}>
                Restore
              </Button>
            }
          />
        ))}
      </div>
      <Sheet open={pending !== null} onClose={() => setPending(null)} title="Replace all data?">
        <div className="stack">
          <div className="muted small">
            Schema v{pending?.env.schemaVersion ?? ''}
            {pending?.env.exportedAt ? `, ${new Date(pending.env.exportedAt).toLocaleString('en-GB')}` : ''}
          </div>
          {Object.entries(counts).map(([t, n]) => (
            <div key={t} className="kv">
              <span>{t}</span>
              <span className="muted">{n}</span>
            </div>
          ))}
          <div className="muted small">A snapshot of the current data is taken first.</div>
          <div className="btn-row">
            <Button onClick={() => setPending(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmImport} disabled={busy}>
              Replace
            </Button>
          </div>
        </div>
      </Sheet>
    </Card>
  )
}
