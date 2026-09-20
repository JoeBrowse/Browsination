import { useNavigate } from 'react-router'
import { getModules } from '@/core/modules/registry'
import type { TodayCard } from '@/core/modules/types'
import { collectToday } from '@/core/today/collect'
import { calendarDay, todayLocal } from '@/core/time/localDay'
import { Button, EmptyState, ListRow, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../services'

export const TODAY_CAP = 8

export function TodayScreen() {
  const s = useServices()
  const navigate = useNavigate()
  const q = useQuery(
    async () => {
      const dayStartHour = await s.settings.get('dayStartHour')
      const now = new Date()
      return collectToday({ db: s.db, today: todayLocal(now, dayStartHour), calendarToday: calendarDay(now), now }, getModules(), TODAY_CAP)
    },
    ['*'],
  )
  const cards = q.data?.shown ?? []
  return (
    <Screen title="Today">
      {q.loading ? null : cards.length === 0 ? <EmptyState>Nothing here yet</EmptyState> : null}
      <div className="list">
        {cards.map((c) => (
          <TodayRow key={c.key} card={c} onOpen={() => c.href && navigate(c.href)} />
        ))}
      </div>
      {q.data && Object.keys(q.data.collapsed).length > 0 ? (
        <div className="muted small" style={{ marginTop: 10 }}>
          {Object.entries(q.data.collapsed)
            .map(([m, n]) => `${n} more in ${m}`)
            .join(', ')}
        </div>
      ) : null}
    </Screen>
  )
}

function TodayRow({ card, onOpen }: { card: TodayCard; onOpen: () => void }) {
  return (
    <ListRow
      title={card.title}
      sub={card.sub}
      onClick={card.href ? onOpen : undefined}
      right={card.action ? <Button onClick={() => void card.action?.run()}>{card.action.label}</Button> : null}
    />
  )
}
