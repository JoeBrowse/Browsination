import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { Button, Card, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useWorkRepo } from '../useWork'

/** Role, what they care about, and the running 1:1 notes. */
export function WorkPersonScreen() {
  const { id = '' } = useParams()
  const repo = useWorkRepo()
  const navigate = useNavigate()
  const [day, setDay] = useState(calendarDay())
  const [notes, setNotes] = useState('')
  const [confirm, setConfirm] = useState(false)
  const q = useQuery(async () => ({ person: await repo.contact(id), notes: await repo.oneOnOnes(id) }), ['people', 'one_on_ones'], [id])
  const p = q.data?.person
  if (!p) return <Screen title="Person">{q.loading ? null : <div className="empty">Not found</div>}</Screen>
  const update = (patch: Parameters<typeof repo.updateContact>[1]) => void repo.updateContact(p.id, patch)
  return (
    <Screen title={p.name}>
      <Card>
        <div className="stack" style={{ gap: 8 }}>
          <input aria-label="Name" defaultValue={p.name} onBlur={(e) => e.target.value.trim() && update({ name: e.target.value.trim() })} />
          <input aria-label="Role" placeholder="Role" defaultValue={p.role} onBlur={(e) => update({ role: e.target.value })} />
          <div className="small muted">Cares about</div>
          <textarea aria-label="Cares about" placeholder="What matters to them" defaultValue={p.cares_about} onBlur={(e) => update({ cares_about: e.target.value })} />
          <textarea aria-label="Notes" placeholder="Notes" defaultValue={p.notes} onBlur={(e) => update({ notes: e.target.value })} />
        </div>
      </Card>
      <SectionTitle>1:1 notes</SectionTitle>
      <form
        className="stack"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!notes.trim()) return
          void repo.addOneOnOne(p.id, day, notes)
          setNotes('')
        }}
      >
        <div className="row">
          <input type="date" aria-label="1:1 date" value={day} onChange={(e) => setDay(e.target.value)} style={{ width: 150 }} />
          <Button type="submit" variant="primary" disabled={!notes.trim()}>
            Add
          </Button>
        </div>
        <textarea aria-label="1:1 notes" placeholder="What was said, what was agreed" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </form>
      <div className="list" style={{ marginTop: 10 }}>
        {(q.data?.notes ?? []).map((n) => (
          <div key={n.id} className="list-row" style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div className="muted small">{formatDay(n.day)}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{n.notes}</div>
            </div>
            <Button ariaLabel="Remove note" onClick={() => void repo.removeOneOnOne(n.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <Button variant="danger" onClick={() => (confirm ? void repo.removeContact(p.id).then(() => navigate('/m/work/people')) : setConfirm(true))}>
          {confirm ? 'Really remove with notes' : 'Remove'}
        </Button>
      </div>
    </Screen>
  )
}
