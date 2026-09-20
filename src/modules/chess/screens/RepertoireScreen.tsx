import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { dueForReview, treeOrder } from '../logic'
import type { RepertoireRow } from '../repo'
import { useChessRepo } from '../useChess'

type Colour = 'white' | 'black'

/** Opening repertoire as a tree per colour. PGN is plain text. Lines come back for review by confidence. */
export function RepertoireScreen() {
  const repo = useChessRepo()
  const [colour, setColour] = useState<Colour>('white')
  const [name, setName] = useState('')
  const [open, setOpen] = useState<RepertoireRow | null>(null)
  const [parentFor, setParentFor] = useState<RepertoireRow | null>(null)
  const q = useQuery(() => repo.repertoire(colour), ['repertoire'], [colour])
  const today = calendarDay()
  const rows = q.data ?? []
  const due = dueForReview(rows, today)
  const dueIds = new Set(due.map((d) => d.id))
  const tree = treeOrder(rows)
  const add = async (parent: RepertoireRow | null) => {
    if (!name.trim()) return
    await repo.addLine({ colour, parent_id: parent?.id ?? null, name })
    setName('')
    setParentFor(null)
  }
  return (
    <Screen title="Openings" right={due.length ? <Button variant="primary" onClick={() => setOpen(due[0]!)}>{`Review ${due.length}`}</Button> : null}>
      <Chips
        label="Colour"
        value={colour}
        onChange={setColour}
        options={[
          { label: 'White', value: 'white' as Colour },
          { label: 'Black', value: 'black' as Colour },
        ]}
      />
      {!q.loading && rows.length === 0 ? <EmptyState>No lines yet</EmptyState> : null}
      <div className="list" style={{ marginTop: 10 }}>
        {tree.map((r) => (
          <div key={r.id} className="list-row" style={{ paddingLeft: r.depth * 18 }}>
            <button className="grow task-body" onClick={() => setOpen(r)}>
              <div className="title">{r.name}</div>
              <div className="sub">{[r.pgn.split('\n')[0]?.slice(0, 40) || null, r.last_reviewed ? `reviewed ${formatDay(r.last_reviewed)}` : 'never reviewed'].filter(Boolean).join(' · ')}</div>
            </button>
            <span className={`pill${dueIds.has(r.id) ? ' accent' : ''}`}>{r.confidence}/5</span>
            <Button ariaLabel={`Add line under ${r.name}`} onClick={() => setParentFor(r)}>
              +
            </Button>
          </div>
        ))}
      </div>
      <form
        className="row"
        style={{ marginTop: 10 }}
        onSubmit={(e) => {
          e.preventDefault()
          void add(parentFor)
        }}
      >
        <input aria-label="New line" placeholder={parentFor ? `Under ${parentFor.name}` : 'New line'} value={name} onChange={(e) => setName(e.target.value)} />
        {parentFor ? <Button onClick={() => setParentFor(null)}>Top</Button> : null}
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Add
        </Button>
      </form>
      <LineSheet line={open} onClose={() => setOpen(null)} today={today} />
    </Screen>
  )
}

function LineSheet({ line, onClose, today }: { line: RepertoireRow | null; onClose: () => void; today: string }) {
  const repo = useChessRepo()
  if (!line) return null
  const update = (patch: Parameters<typeof repo.updateLine>[1]) => void repo.updateLine(line.id, patch)
  return (
    <Sheet open onClose={onClose} title={line.name}>
      <div className="stack" key={line.id}>
        <input aria-label="Line name" defaultValue={line.name} onBlur={(e) => update({ name: e.target.value.trim() || line.name })} />
        <textarea aria-label="PGN" placeholder="1. d4 d5 2. Bf4 …" defaultValue={line.pgn} onBlur={(e) => update({ pgn: e.target.value })} style={{ fontFamily: 'monospace', minHeight: 120 }} />
        <textarea aria-label="Line notes" placeholder="Ideas, traps, plans" defaultValue={line.notes} onBlur={(e) => update({ notes: e.target.value })} />
        <div className="small muted">Confidence</div>
        <Chips label="Confidence" value={line.confidence} onChange={(v) => update({ confidence: v })} options={[1, 2, 3, 4, 5].map((v) => ({ label: String(v), value: v }))} />
        <div className="muted small">{line.last_reviewed ? `Last reviewed ${formatDay(line.last_reviewed)}` : 'Never reviewed'}</div>
        <div className="btn-row">
          <Button
            variant="primary"
            onClick={() => {
              void repo.markReviewed(line.id, today)
              onClose()
            }}
          >
            Reviewed today
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void repo.removeLine(line.id)
              onClose()
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
