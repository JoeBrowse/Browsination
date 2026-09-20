import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getModules } from '@/core/modules/registry'
import type { TodayCard } from '@/core/modules/types'
import type { ItemRow } from '@/core/repos/items'
import { collectToday } from '@/core/today/collect'
import { calendarDay, formatDay, todayLocal } from '@/core/time/localDay'
import { Button, EmptyState, ListRow, ModuleScope, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../services'
import { FOCUS_CAP, FocusPicker } from '../tasks/FocusPicker'
import { ItemSheet } from '../tasks/ItemSheet'
import { TaskRow } from '../tasks/TaskRow'
import { useComplete } from '../tasks/useComplete'

export const TODAY_CAP = 8

export function TodayScreen() {
  const s = useServices()
  const navigate = useNavigate()
  const complete = useComplete()
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState<ItemRow | null>(null)
  const calendarToday = calendarDay()

  const q = useQuery(
    async () => {
      const dayStartHour = await s.settings.get('dayStartHour')
      const now = new Date()
      const today = todayLocal(now, dayStartHour)
      const [focus, overdue, due, chase, modules] = await Promise.all([
        s.tasks.focus(calendarToday),
        s.tasks.overdue(calendarToday),
        s.tasks.dueOn(calendarToday),
        s.tasks.chaseDue(calendarToday),
        collectToday({ db: s.db, today, calendarToday, now }, getModules(), TODAY_CAP),
      ])
      return { focus, overdue, due, chase, modules }
    },
    ['*'],
  )
  const d = q.data
  const focusIds = new Set((d?.focus ?? []).map((i) => i.id))
  const notFocused = (list: ItemRow[]) => list.filter((i) => !focusIds.has(i.id))
  const empty = d && d.focus.length + d.overdue.length + d.due.length + d.chase.length + d.modules.shown.length === 0
  const panels = getModules().flatMap((m) => (m.panels ?? []).map((p) => ({ ...p, accent: m.accent })))

  return (
    <Screen title="Today" right={<span className="muted small">{formatDay(calendarToday)}</span>}>
      {panels.map((p) => (
        <ModuleScope key={p.key} accent={p.accent}>
          <p.component />
        </ModuleScope>
      ))}
      <SectionTitle>
        Focus {d ? `${d.focus.length}/${FOCUS_CAP}` : ''}
        <Button onClick={() => setPicking(true)}>Pick</Button>
      </SectionTitle>
      <div className="list">
        {(d?.focus ?? []).map((i) => (
          <TaskRow key={i.id} item={i} onOpen={setEditing} onDone={(it) => void complete(it)} />
        ))}
      </div>
      {d && d.overdue.length ? <Section title="Overdue" items={notFocused(d.overdue)} onOpen={setEditing} onDone={complete} /> : null}
      {d && d.due.length ? <Section title="Due today" items={notFocused(d.due)} onOpen={setEditing} onDone={complete} /> : null}
      {d && d.chase.length ? <Section title="Chase" items={notFocused(d.chase)} onOpen={setEditing} onDone={complete} /> : null}
      <SectionTitle>Calendar</SectionTitle>
      {d && d.modules.shown.some((c) => c.kind === 'event') ? (
        <div className="list">
          {d.modules.shown
            .filter((c) => c.kind === 'event')
            .map((c) => (
              <CardRow key={c.key} card={c} onOpen={() => c.href && navigate(c.href)} />
            ))}
        </div>
      ) : (
        <div className="muted small">Nothing in the calendar</div>
      )}
      {d && d.modules.shown.some((c) => c.kind !== 'event') ? (
        <>
          <SectionTitle>Modules</SectionTitle>
          <div className="list">
            {d.modules.shown
              .filter((c) => c.kind !== 'event')
              .map((c) => (
                <CardRow key={c.key} card={c} onOpen={() => c.href && navigate(c.href)} />
              ))}
          </div>
        </>
      ) : null}
      {d && Object.keys(d.modules.collapsed).length > 0 ? (
        <div className="muted small" style={{ marginTop: 10 }}>
          {Object.entries(d.modules.collapsed)
            .map(([m, n]) => `${n} more in ${m}`)
            .join(', ')}
        </div>
      ) : null}
      {empty ? <EmptyState>Clear</EmptyState> : null}
      <FocusPicker open={picking} onClose={() => setPicking(false)} today={calendarToday} />
      <ItemSheet item={editing} open={editing !== null} onClose={() => setEditing(null)} />
    </Screen>
  )
}

function Section({ title, items, onOpen, onDone }: { title: string; items: ItemRow[]; onOpen: (i: ItemRow) => void; onDone: (i: ItemRow) => Promise<void> }) {
  if (items.length === 0) return null
  return (
    <>
      <SectionTitle>
        {title} · {items.length}
      </SectionTitle>
      <div className="list">
        {items.map((i) => (
          <TaskRow key={i.id} item={i} onOpen={onOpen} onDone={(it) => void onDone(it)} />
        ))}
      </div>
    </>
  )
}

function CardRow({ card, onOpen }: { card: TodayCard; onOpen: () => void }) {
  return (
    <ListRow
      title={card.title}
      sub={card.sub}
      onClick={card.href ? onOpen : undefined}
      right={card.action ? <Button onClick={() => void card.action?.run()}>{card.action.label}</Button> : null}
    />
  )
}
