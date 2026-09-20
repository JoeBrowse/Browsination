import { useState } from 'react'
import type { ItemRow } from '@/core/repos/items'
import { EmptyState, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../services'
import { Chips } from '../tasks/fields'
import { ItemSheet } from '../tasks/ItemSheet'
import { TaskRow } from '../tasks/TaskRow'
import { useComplete } from '../tasks/useComplete'
import { WinsList } from '../tasks/WinsList'

type Segment = 'inbox' | 'todo' | 'waiting' | 'wins'

/** Inbox triage plus the other task lists: To-do, Waiting, Wins. */
export function InboxScreen() {
  const s = useServices()
  const complete = useComplete()
  const [seg, setSeg] = useState<Segment>('inbox')
  const [editing, setEditing] = useState<ItemRow | null>(null)
  const inbox = useQuery(() => s.items.listByStatus('inbox'), ['items'])
  const todo = useQuery(() => s.items.listByStatus('todo'), ['items'])
  const waiting = useQuery(() => s.items.listByStatus('waiting'), ['items'])
  const n = (q: { data?: ItemRow[] }) => (q.data?.length ? ` ${q.data.length}` : '')
  const list = seg === 'inbox' ? inbox : seg === 'todo' ? todo : waiting
  const items = list.data ?? []

  return (
    <Screen title="Inbox">
      <Chips
        label="List"
        value={seg}
        onChange={setSeg}
        options={[
          { label: `Inbox${n(inbox)}`, value: 'inbox' as Segment },
          { label: `To-do${n(todo)}`, value: 'todo' as Segment },
          { label: `Waiting${n(waiting)}`, value: 'waiting' as Segment },
          { label: 'Wins', value: 'wins' as Segment },
        ]}
      />
      <div style={{ height: 10 }} />
      {seg === 'wins' ? (
        <WinsList onOpen={setEditing} />
      ) : (
        <>
          {!list.loading && items.length === 0 ? <EmptyState>{seg === 'inbox' ? 'Inbox empty' : 'Nothing here'}</EmptyState> : null}
          <div className="list">
            {items.map((i) => (
              <TaskRow key={i.id} item={i} onOpen={setEditing} onDone={(it) => void complete(it)} />
            ))}
          </div>
        </>
      )}
      <ItemSheet item={editing} open={editing !== null} onClose={() => setEditing(null)} />
    </Screen>
  )
}
