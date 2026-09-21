import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Chips } from '@/app/tasks/fields'
import { useServices } from '@/app/services'
import { toast } from '@/app/shellStore'
import { newId } from '@/core/ids'
import { bytesToBase64 } from '@/core/platform/fileStore'
import { Button, Card, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { chunkStage, percent, pieceProgress } from '../learning/logic'
import { formatDay } from '@/core/time/localDay'
import { STATUSES, type PieceStatus } from '../repo'
import { useBanjoRepo } from '../useBanjo'

const ACCEPT = 'application/pdf,image/*'

/** A piece: tuning, status, notes, and its sheet music or tab files stored on the device. */
export function PieceScreen() {
  const { id = '' } = useParams()
  const s = useServices()
  const repo = useBanjoRepo()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const q = useQuery(async () => ({ piece: await repo.piece(id), files: await repo.pieceFiles(id), chunks: await repo.chunks(id) }), ['banjo_pieces', 'files', 'banjo_chunks'], [id])
  const p = q.data?.piece
  if (!p) return <Screen title="Piece">{q.loading ? null : <div className="empty">Not found</div>}</Screen>
  const update = (patch: Parameters<typeof repo.updatePiece>[1]) => void repo.updatePiece(p.id, patch)

  const importFile = async (file: File) => {
    setBusy(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase() : file.type === 'application/pdf' ? 'pdf' : 'bin'
      const fileId = newId()
      const rel_path = `files/banjo/${fileId}.${ext}`
      await s.files.writeBase64(rel_path, bytesToBase64(bytes))
      await repo.files.create({ module: 'banjo', entity_type: 'banjo.piece', entity_id: p.id, rel_path, mime: file.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'), title: file.name })
      toast('Added')
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const removeFile = async (fileId: string, rel_path: string) => {
    await repo.files.remove(fileId)
    await s.files.remove(rel_path).catch(() => undefined)
  }

  return (
    <Screen title={p.title}>
      <Card>
        <div className="stack" style={{ gap: 8 }}>
          <input aria-label="Piece title" defaultValue={p.title} onBlur={(e) => update({ title: e.target.value.trim() || p.title })} />
          <input aria-label="Tuning" placeholder="Tuning (e.g. gDGBD)" defaultValue={p.tuning} onBlur={(e) => update({ tuning: e.target.value })} />
          <Chips label="Piece status" value={p.status} onChange={(v) => update({ status: v as PieceStatus })} options={STATUSES.map((st) => ({ label: st.label, value: st.key as PieceStatus }))} />
          <textarea aria-label="Piece notes" placeholder="Notes" defaultValue={p.notes} onBlur={(e) => update({ notes: e.target.value })} />
          <div className="row" style={{ minHeight: 40 }}>
            <span className="grow small muted">Bars in the score</span>
            <input type="number" inputMode="numeric" min={1} aria-label="Bars" style={{ width: 90 }} defaultValue={p.bars ?? ''} onBlur={(e) => update({ bars: Number(e.target.value) > 0 ? Math.round(Number(e.target.value)) : null })} />
          </div>
        </div>
      </Card>
      <SectionTitle>Learning</SectionTitle>
      <Card>
        {(() => {
          const pr = pieceProgress(p, q.data?.chunks ?? [])
          return (
            <>
              <div className="kv">
                <span>{p.bars ? `${pr.learned} of ${p.bars} bars` : `${pr.learned} bars`}</span>
                <span className="pill accent">{p.bars ? percent(pr.learnedFraction) : '–'}</span>
              </div>
              {p.bars ? (
                <div className="progress" aria-label={`${percent(pr.learnedFraction)} learned`}>
                  <div style={{ width: `${(pr.learnedFraction ?? 0) * 100}%` }} />
                </div>
              ) : null}
              {pr.solid ? <div className="muted small">{pr.solid} bars solid · {percent(pr.solidFraction)}</div> : null}
            </>
          )
        })()}
        <div className="list" style={{ marginTop: 6 }}>
          {(q.data?.chunks ?? []).map((c) => (
            <div key={c.id} className="list-row" style={{ minHeight: 40 }}>
              <span className="grow">
                bars {c.from_bar}–{c.to_bar} <span className="muted small">{chunkStage(c)} · next {formatDay(c.due)}{c.lapses ? ` · slipped ${c.lapses}×` : ''}</span>
              </span>
              <Button ariaLabel={`Remove chunk ${c.from_bar}-${c.to_bar}`} onClick={() => void repo.removeChunk(c.id)}>
                ×
              </Button>
            </div>
          ))}
        </div>
        {(q.data?.chunks ?? []).length ? <Button onClick={() => void repo.resetLearning(p.id)}>Reset learning</Button> : null}
      </Card>
      <SectionTitle>Sheet music</SectionTitle>
      <div className="list">
        {(q.data?.files ?? []).map((f) => (
          <div key={f.id} className="list-row">
            <Link to={`file/${f.id}`} className="grow">
              <div className="title">{f.title}</div>
              <div className="sub">{f.mime}</div>
            </Link>
            <Button ariaLabel={`Remove ${f.title}`} onClick={() => void removeFile(f.id, f.rel_path)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <label className={`btn${busy ? ' disabled' : ''}`} style={{ marginTop: 10 }}>
        {busy ? 'Adding…' : 'Add PDF or image'}
        <input type="file" accept={ACCEPT} aria-label="Add file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = '' }} />
      </label>
      <div style={{ marginTop: 24 }}>
        <Button
          variant="danger"
          onClick={() => {
            void repo.removePiece(p.id)
            navigate('/m/banjo/library')
          }}
        >
          Delete piece
        </Button>
      </div>
    </Screen>
  )
}
