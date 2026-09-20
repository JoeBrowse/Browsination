import { useEffect, useState } from 'react'
import type { ItemRow, ItemStatus, RecurFrom } from '@/core/repos/items'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../services'
import { toast } from '../shellStore'
import { Chips, DueDateField, ModuleField, PriorityField, RecurrenceField } from './fields'
import { useComplete } from './useComplete'

interface Draft {
  title: string
  notes: string
  module: string | null
  status: ItemStatus
  due_date: string | null
  due_time: string | null
  reminder_time: string | null
  recurrence: string | null
  recur_from: RecurFrom
  priority: number
  waiting_person_id: string | null
  chase_date: string | null
}

function toDraft(item: ItemRow | null): Draft {
  return {
    title: item?.title ?? '',
    notes: item?.notes ?? '',
    module: item?.module ?? null,
    status: item?.status ?? 'todo',
    due_date: item?.due_date ?? null,
    due_time: item?.due_time ?? null,
    reminder_time: item?.reminder_at?.slice(11) ?? null,
    recurrence: item?.recurrence ?? null,
    recur_from: item?.recur_from ?? 'due',
    priority: item?.priority ?? 0,
    waiting_person_id: item?.waiting_person_id ?? null,
    chase_date: item?.chase_date ?? null,
  }
}

/** Create or edit an item. Also the inbox triage surface: status chips at the top, big actions at the bottom. */
export function ItemSheet({ item, open, onClose }: { item: ItemRow | null; open: boolean; onClose: () => void }) {
  const s = useServices()
  const complete = useComplete()
  const [d, setD] = useState<Draft>(() => toDraft(item))
  const [newPerson, setNewPerson] = useState('')
  const people = useQuery(() => s.people.list(), ['people'])
  useEffect(() => {
    if (open) setD(toDraft(item))
  }, [open, item])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const save = async () => {
    if (!d.title.trim()) return
    let waiting_person_id = d.waiting_person_id
    if (d.status === 'waiting' && !waiting_person_id && newPerson.trim()) waiting_person_id = (await s.people.create({ name: newPerson })).id
    const reminderDate = d.due_date ?? item?.due_date ?? null
    const patch = {
      title: d.title,
      notes: d.notes,
      module: d.module,
      status: d.status,
      due_date: d.due_date,
      due_time: d.due_time,
      reminder_at: d.reminder_time && reminderDate ? `${reminderDate}T${d.reminder_time}` : null,
      recurrence: d.recurrence,
      recur_from: d.recur_from,
      priority: d.priority,
      waiting_person_id: d.status === 'waiting' ? waiting_person_id : null,
      chase_date: d.status === 'waiting' ? d.chase_date : null,
    }
    if (item) await s.items.update(item.id, patch)
    else await s.items.create(patch)
    onClose()
  }
  const setStatus = async (status: ItemStatus) => {
    if (!item) return
    await s.items.setStatus(item.id, status)
    toast(status === 'dropped' ? 'Dropped' : 'Saved')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={item ? 'Item' : 'New item'}>
      <div className="stack">
        <input aria-label="Title" value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="Title" />
        <Chips
          label="Status"
          value={d.status}
          onChange={(v) => set('status', v)}
          options={[
            { label: 'Inbox', value: 'inbox' as ItemStatus },
            { label: 'To-do', value: 'todo' as ItemStatus },
            { label: 'Waiting', value: 'waiting' as ItemStatus },
          ]}
        />
        {d.status === 'waiting' ? (
          <div className="stack" style={{ gap: 6 }}>
            <select aria-label="Waiting on" value={d.waiting_person_id ?? ''} onChange={(e) => set('waiting_person_id', e.target.value || null)}>
              <option value="">Who?</option>
              {(people.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {!d.waiting_person_id ? <input aria-label="New person" placeholder="New person" value={newPerson} onChange={(e) => setNewPerson(e.target.value)} /> : null}
            <input type="date" aria-label="Chase date" value={d.chase_date ?? ''} onChange={(e) => set('chase_date', e.target.value || null)} />
          </div>
        ) : null}
        <ModuleField value={d.module} onChange={(v) => set('module', v)} />
        <DueDateField value={d.due_date} onChange={(v) => set('due_date', v)} />
        <div className="row">
          <input type="time" aria-label="Due time" value={d.due_time ?? ''} onChange={(e) => set('due_time', e.target.value || null)} />
          <input type="time" aria-label="Reminder time" value={d.reminder_time ?? ''} onChange={(e) => set('reminder_time', e.target.value || null)} />
        </div>
        <div className="muted small">Left: due time. Right: reminder time (needs a due date).</div>
        <PriorityField value={d.priority} onChange={(v) => set('priority', v)} />
        <RecurrenceField recurrence={d.recurrence} recurFrom={d.recur_from} onChange={(r, f) => setD((x) => ({ ...x, recurrence: r, recur_from: f }))} />
        <textarea aria-label="Notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notes" />
        <div className="btn-row">
          <Button variant="primary" onClick={() => void save()} disabled={!d.title.trim()}>
            Save
          </Button>
          {item && item.status !== 'done' ? (
            <Button
              onClick={() => {
                onClose()
                void complete(item)
              }}
            >
              Done
            </Button>
          ) : null}
          {item ? (
            <Button variant="danger" onClick={() => void setStatus('dropped')}>
              Drop
            </Button>
          ) : null}
        </div>
      </div>
    </Sheet>
  )
}
