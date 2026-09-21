import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import type { LearningKind, LearningRow, LearningStatus } from '../repo'
import { useWorkRepo } from '../useWork'

const KINDS: { label: string; value: LearningKind }[] = [
  { label: 'Book', value: 'book' },
  { label: 'Course', value: 'course' },
  { label: 'Article', value: 'article' },
  { label: 'Video', value: 'video' },
  { label: 'Other', value: 'other' },
]
const NEXT: Record<LearningStatus, LearningStatus> = { todo: 'doing', doing: 'done', done: 'todo', dropped: 'todo' }

/** Reading and learning list: tap the status to move it along, expand a row for notes. */
export function LearningScreen() {
  const repo = useWorkRepo()
  const q = useQuery(() => repo.learning(), ['learning_items'])
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<LearningKind>('book')
  const [open, setOpen] = useState<string | null>(null)
  const rows = q.data ?? []
  const group = (status: LearningStatus[]) => rows.filter((r) => status.includes(r.status))
  const row = (r: LearningRow) => (
    <div key={r.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
      <div className="row" style={{ minHeight: 32 }}>
        <button className="chip" aria-label={`Status ${r.title}`} onClick={() => void repo.updateLearning(r.id, { status: NEXT[r.status] })}>
          {r.status}
        </button>
        <button className="grow" style={{ textAlign: 'left' }} onClick={() => setOpen(open === r.id ? null : r.id)}>
          <div style={{ textDecoration: r.status === 'dropped' ? 'line-through' : 'none' }}>{r.title}</div>
          <div className="sub">{r.kind}</div>
        </button>
        <Button ariaLabel={`Remove ${r.title}`} onClick={() => void repo.removeLearning(r.id)}>
          ×
        </Button>
      </div>
      {open === r.id ? (
        <div className="stack" style={{ gap: 6 }}>
          <input aria-label="Link" placeholder="Link" defaultValue={r.url} onBlur={(e) => void repo.updateLearning(r.id, { url: e.target.value.trim() })} />
          <textarea aria-label="Learning notes" placeholder="Notes" defaultValue={r.notes} onBlur={(e) => void repo.updateLearning(r.id, { notes: e.target.value })} />
          {r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" className="small">
              Open link
            </a>
          ) : null}
          {r.status !== 'dropped' ? <Button onClick={() => void repo.updateLearning(r.id, { status: 'dropped' })}>Drop</Button> : null}
        </div>
      ) : null}
    </div>
  )
  return (
    <Screen title="Learning">
      <form
        className="stack"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          void repo.addLearning(title, kind)
          setTitle('')
        }}
      >
        <div className="row">
          <input aria-label="New learning item" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit" variant="primary" disabled={!title.trim()}>
            Add
          </Button>
        </div>
        <Chips label="Learning kind" value={kind} onChange={setKind} options={KINDS} />
      </form>
      {q.data && rows.length === 0 ? <EmptyState>Nothing on the list</EmptyState> : null}
      <div className="list" style={{ marginTop: 12 }}>
        {group(['doing', 'todo']).map(row)}
      </div>
      {group(['done', 'dropped']).length ? (
        <div className="list" style={{ marginTop: 12, opacity: 0.7 }}>
          {group(['done', 'dropped']).map(row)}
        </div>
      ) : null}
    </Screen>
  )
}
