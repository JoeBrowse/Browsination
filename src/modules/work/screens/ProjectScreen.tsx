import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ItemSheet } from '@/app/tasks/ItemSheet'
import { TaskRow } from '@/app/tasks/TaskRow'
import { useComplete } from '@/app/tasks/useComplete'
import type { ItemRow } from '@/core/repos/items'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { Button, Card, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { ProjectSheet } from '../sheets/ProjectSheet'
import { useWorkRepo } from '../useWork'

/** One project: next actions (items), key dates, notes. */
export function ProjectScreen() {
  const { id = '' } = useParams()
  const repo = useWorkRepo()
  const navigate = useNavigate()
  const complete = useComplete()
  const [editing, setEditing] = useState(false)
  const [item, setItem] = useState<ItemRow | null>(null)
  const [action, setAction] = useState('')
  const [date, setDate] = useState({ label: '', date: calendarDay() })
  const [showDone, setShowDone] = useState(false)
  const q = useQuery(async () => {
    const project = await repo.project(id)
    return project ? { project, actions: await repo.actions(id) } : null
  }, ['projects', 'items'], [id])
  const d = q.data
  if (!d) return <Screen title="Project">{q.loading ? null : <div className="empty">Not found</div>}</Screen>
  const { project } = d
  const dates = repo.keyDates(project)
  const open = d.actions.filter(repo.isOpen)
  const done = d.actions.filter((i) => !repo.isOpen(i))
  return (
    <Screen title={project.name} right={<Button onClick={() => setEditing(true)}>Edit</Button>}>
      <Card>
        <div className="kv">
          <span className="muted">{project.area === 'side' ? 'Side project' : 'Day job'}</span>
          <span className="pill">{project.status}</span>
        </div>
        {project.client ? (
          <div className="kv">
            <span className="muted">Client</span>
            <span>{project.client}</span>
          </div>
        ) : null}
        {project.notes ? <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{project.notes}</div> : null}
      </Card>
      <SectionTitle>Next actions · {open.length}</SectionTitle>
      <div className="list">
        {open.map((i) => (
          <TaskRow key={i.id} item={i} onOpen={setItem} onDone={(it) => void complete(it)} />
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!action.trim()) return
          void repo.addAction(project.id, action)
          setAction('')
        }}
      >
        <input aria-label="New action" placeholder="Next action" value={action} onChange={(e) => setAction(e.target.value)} />
        <Button type="submit" disabled={!action.trim()}>
          Add
        </Button>
      </form>
      {done.length ? (
        <Button onClick={() => setShowDone((v) => !v)}>{showDone ? 'Hide done' : `Done · ${done.length}`}</Button>
      ) : null}
      {showDone ? (
        <div className="list" style={{ opacity: 0.7 }}>
          {done.map((i) => (
            <TaskRow key={i.id} item={i} onOpen={setItem} />
          ))}
        </div>
      ) : null}
      <SectionTitle>Key dates</SectionTitle>
      <div className="list">
        {dates.map((k, i) => (
          <div key={`${k.date}-${k.label}`} className="list-row" style={{ minHeight: 44 }}>
            <span className="grow">{k.label}</span>
            <span className="muted small">{formatDay(k.date)}</span>
            <Button ariaLabel={`Remove key date ${k.label}`} onClick={() => void repo.setKeyDates(project.id, dates.filter((_, j) => j !== i))}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!date.label.trim() || !date.date) return
          void repo.setKeyDates(project.id, [...dates, { label: date.label.trim(), date: date.date }])
          setDate({ label: '', date: calendarDay() })
        }}
      >
        <input aria-label="Key date label" placeholder="Label" value={date.label} onChange={(e) => setDate({ ...date, label: e.target.value })} />
        <input type="date" aria-label="Key date" value={date.date} onChange={(e) => setDate({ ...date, date: e.target.value })} style={{ width: 150 }} />
        <Button type="submit" disabled={!date.label.trim() || !date.date}>
          Add
        </Button>
      </form>
      <ProjectSheet open={editing} onClose={() => setEditing(false)} project={project} />
      <ItemSheet item={item} open={item !== null} onClose={() => setItem(null)} />
      {q.data === null ? null : <Button onClick={() => navigate('/m/work')}>Back</Button>}
    </Screen>
  )
}
