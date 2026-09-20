import { EmptyState, ListRow, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../services'

export function InboxScreen() {
  const s = useServices()
  const q = useQuery(() => s.items.listByStatus('inbox'), ['items'])
  const items = q.data ?? []
  return (
    <Screen title="Inbox">
      {!q.loading && items.length === 0 ? <EmptyState>Inbox empty</EmptyState> : null}
      <div className="list">
        {items.map((i) => (
          <ListRow key={i.id} title={i.title} sub={i.notes || undefined} />
        ))}
      </div>
    </Screen>
  )
}
