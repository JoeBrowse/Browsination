import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getModules } from '@/core/modules/registry'
import type { ItemRow } from '@/core/repos/items'
import { collectWeek } from '@/core/today/collectWeek'
import { addDays, formatDay, todayLocal } from '@/core/time/localDay'
import { Button, EmptyState, ModuleScope } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../services'
import { ItemSheet } from '../tasks/ItemSheet'
import { TaskRow } from '../tasks/TaskRow'
import { useComplete } from '../tasks/useComplete'

/** Inbox and Waiting: the same list, tap a row to triage in the item sheet. */
export function ListStep({ status, empty }: { status: 'inbox' | 'waiting'; empty: string }) {
  const s = useServices()
  const complete = useComplete()
  const [editing, setEditing] = useState<ItemRow | null>(null)
  const q = useQuery(() => s.items.listByStatus(status), ['items'], [status])
  const items = q.data ?? []
  return (
    <>
      {!q.loading && items.length === 0 ? <EmptyState>{empty}</EmptyState> : null}
      <div className="list">
        {items.map((i) => (
          <TaskRow key={i.id} item={i} onOpen={setEditing} onDone={(it) => void complete(it)} />
        ))}
      </div>
      <ItemSheet item={editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  )
}

/** Tasks due plus every module's dated things for the week, grouped by day. */
export function WeekAheadStep({ week }: { week: string }) {
  const s = useServices()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<ItemRow | null>(null)
  const to = addDays(week, 6)
  const q = useQuery(async () => {
    const dayStartHour = await s.settings.get('dayStartHour')
    const now = new Date()
    const ctx = { db: s.db, today: todayLocal(now, dayStartHour), calendarToday: week, now, from: week, to }
    const [due, items] = await Promise.all([s.tasks.dueBetween(addDays(week, -1), to), collectWeek(ctx, getModules())])
    return { due, items }
  }, ['*'], [week])
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const modules = new Map(getModules().map((m) => [m.id, m]))
  const empty = q.data && q.data.due.length + q.data.items.length === 0
  return (
    <>
      {empty ? <EmptyState>A clear week</EmptyState> : null}
      {days.map((day) => {
        const due = (q.data?.due ?? []).filter((i) => i.due_date === day)
        const items = (q.data?.items ?? []).filter((w) => w.date === day)
        if (due.length + items.length === 0) return null
        return (
          <div key={day} style={{ marginTop: 10 }}>
            <div className="section-title">{formatDay(day)}</div>
            <div className="list">
              {items.map((w) => {
                const m = modules.get(w.module as never)
                return (
                  <ModuleScope key={w.key} accent={m?.accent ?? 'var(--accent)'}>
                    <button className="list-row" style={{ minHeight: 44, width: '100%' }} onClick={() => w.href && navigate(w.href)}>
                      <span className="pill" style={{ marginRight: 8 }}>
                        {m?.name ?? w.module}
                      </span>
                      <span className="grow" style={{ textAlign: 'left' }}>
                        {w.title}
                      </span>
                      {w.sub ? <span className="muted small">{w.sub}</span> : null}
                    </button>
                  </ModuleScope>
                )
              })}
              {due.map((i) => (
                <TaskRow key={i.id} item={i} onOpen={setEditing} showDue={false} />
              ))}
            </div>
          </div>
        )
      })}
      <ItemSheet item={editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  )
}

/** Every module's consistency lines, in module order. */
export function ConsistencyStep() {
  const s = useServices()
  const q = useQuery(async () => {
    const dayStartHour = await s.settings.get('dayStartHour')
    const now = new Date()
    const ctx = { db: s.db, today: todayLocal(now, dayStartHour), calendarToday: todayLocal(now, 0), now }
    const out: { id: string; name: string; accent: string; lines: { label: string; value: string }[] }[] = []
    for (const m of getModules()) {
      if (!m.consistency) continue
      try {
        out.push({ id: m.id, name: m.name, accent: m.accent, lines: await m.consistency(ctx) })
      } catch {
        /* skip a broken module */
      }
    }
    return out
  }, ['log_entries'])
  return (
    <>
      {q.data && q.data.length === 0 ? <EmptyState>Nothing tracked yet</EmptyState> : null}
      {(q.data ?? []).map((m) => (
        <ModuleScope key={m.id} accent={m.accent}>
          <div className="card" style={{ marginTop: 10 }}>
            <div className="section-title" style={{ color: 'var(--accent)' }}>
              {m.name}
            </div>
            {m.lines.map((l) => (
              <div key={l.label} className="kv" style={{ minHeight: 32 }}>
                <span>{l.label}</span>
                <span className="pill">{l.value}</span>
              </div>
            ))}
          </div>
        </ModuleScope>
      ))}
    </>
  )
}

/** Pick up to three open items (or type a new one) as the week's priorities. */
export function PrioritiesStep({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const s = useServices()
  const [text, setText] = useState('')
  const q = useQuery(() => s.tasks.open(), ['items'])
  const items = q.data ?? []
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else if (selected.length < 3) onChange([...selected, id])
  }
  const add = async () => {
    if (!text.trim() || selected.length >= 3) return
    const item = await s.items.create({ title: text, status: 'todo' })
    onChange([...selected, item.id])
    setText('')
  }
  const chosen = items.filter((i) => selected.includes(i.id))
  const rest = items.filter((i) => !selected.includes(i.id))
  const row = (i: ItemRow) => (
    <div key={i.id} className="list-row" style={{ minHeight: 44 }}>
      <button className={`check${selected.includes(i.id) ? ' on' : ''}`} aria-label={`Priority ${i.title}`} aria-pressed={selected.includes(i.id)} onClick={() => toggle(i.id)} style={{ marginTop: 0 }} />
      <span className="grow">{i.title}</span>
      {i.due_date ? <span className="muted small">{formatDay(i.due_date)}</span> : null}
    </div>
  )
  return (
    <>
      <div className="muted small">{selected.length} of 3</div>
      <div className="list">{chosen.map(row)}</div>
      <form
        className="row"
        style={{ marginTop: 8 }}
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <input aria-label="New priority" placeholder="New priority" value={text} onChange={(e) => setText(e.target.value)} disabled={selected.length >= 3} />
        <Button type="submit" disabled={!text.trim() || selected.length >= 3}>
          Add
        </Button>
      </form>
      <div className="list" style={{ marginTop: 8 }}>
        {rest.slice(0, 40).map(row)}
      </div>
    </>
  )
}
